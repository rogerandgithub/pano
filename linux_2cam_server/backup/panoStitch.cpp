#include "panoStitch.h"





//============================================================================================================//
panoStitch panoStitch::creatDefault(bool try_use_gpu, float seamScale, int blendLayer)
{
	panoStitch stitcher;

	stitcher.setSeamScale(seamScale);

#ifdef HAVE_CUDA
	if (try_use_gpu && cuda::getCudaEnabledDeviceCount() > 0)
	{
		stitcher.setWarper(makePtr<SphericalWarperGpu>());
		stitcher.setSeamFinder(makePtr<detail::GraphCutSeamFinderGpu>());
	}
	else
#endif
	{
		stitcher.setWarper(makePtr<SphericalWarper>());
		stitcher.setSeamFinder(makePtr<detail::GraphCutSeamFinder>(detail::GraphCutSeamFinderBase::COST_COLOR));
	}

	stitcher.setExposureCompensator(makePtr<detail::BlocksGainCompensator>());
	stitcher.setBlender(makePtr<detail::MultiBandBlender>(try_use_gpu, blendLayer));


	return stitcher;
}



panoStitch::Status panoStitch::stitcher(InputArray src, OutputArray pano, const string& xml_path)
{
	
	src.getUMatVector(imgs_);

	img_num_ = imgs_.size();

	if (img_num_ < 2)
	{
		cout<<"Need more images"<<endl;
		return ERR;
	}

	//read params
	readCameraParams(xml_path);

	panoStitch::Status status = myComposePanorama(pano);

	if (status != panoStitch::OK)
	{
		std::cout << "Error : Can't stitch images!" << endl;
		return ERR;
	}


// 	cv::Mat warpPanoImage_tmp;
// 	cv::warpPerspective(pano_in, pano, cali_params_.H, cv::Size(5000 * img_resize_scale_, 2500 * img_resize_scale_), cv::INTER_CUBIC, cv::BORDER_CONSTANT);
// 	start_end_blend(pano, 10);




	return status;
}





void panoStitch::start_end_blend(OutputArray imgin, int blendLength)
{
	Mat img = imgin.getMatRef();
	int W = img.cols;
	int H = img.rows;

	for (int y = 0; y < H; ++y){
		for (int x = W - blendLength; x < W + blendLength; ++x)
		{
			int num = 0;
			int b = 0; int g = 0; int r = 0;
			//std::cout<<"  dfgadgf "<<endl;
			for (int m = -1; m <= 1; ++m)
			{
				//std::cout<<"  sfghdfg "<<endl;
				if ((y + m < 0) || (y + m >= H)) continue;
				//std::cout<<"  rtyhdrh "<<endl;
				for (int n = -1; n <= 1; ++n)
				{
					num++;
					b += img.at<cv::Vec3b>(y + m, (x + n) % W)[0];
					g += img.at<cv::Vec3b>(y + m, (x + n) % W)[1];
					r += img.at<cv::Vec3b>(y + m, (x + n) % W)[2];
				}
			}
			img.at<cv::Vec3b>(y, x%W)[0] = (uchar)(b / num);
			img.at<cv::Vec3b>(y, x%W)[1] = (uchar)(g / num);
			img.at<cv::Vec3b>(y, x%W)[2] = (uchar)(r / num);
		}
	}
}



panoStitch::Status panoStitch::myComposePanoramaOMP(OutputArray pano)
{
	vector<UMat> seam_est_imgs_;

	seam_est_imgs_.resize(img_num_);

	//step 1: 计算seam估计图像
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img_num_; ++i)
	{
		resize(imgs_[i], seam_est_imgs_[i], Size(), seam_scale_, seam_scale_);
	}

	vector<Point> corners(img_num_);
	vector<UMat> masks_warped(img_num_);
	vector<UMat> images_warped(img_num_);
	vector<Size> sizes(img_num_);
	vector<UMat> masks(img_num_);

	// Prepare image masks
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img_num_; ++i)
	{
		masks[i].create(seam_est_imgs_[i].size(), CV_8U);
		masks[i].setTo(Scalar::all(255));
	}


	// Warp images and their masks
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img_num_; ++i)
	{
		double seam_work_aspect_ = seam_scale_ / work_scale_;
		Ptr<detail::RotationWarper> w = warper_->create(float(warped_image_scale_ * seam_work_aspect_));
		Mat_<float> K;
		cameras_[i].K().convertTo(K, CV_32F);
		K(0, 0) *= (float)seam_work_aspect_;
		K(0, 2) *= (float)seam_work_aspect_;
		K(1, 1) *= (float)seam_work_aspect_;
		K(1, 2) *= (float)seam_work_aspect_;

		corners[i] = w->warp(seam_est_imgs_[i], K, cameras_[i].R, INTER_LINEAR, BORDER_REFLECT, images_warped[i]);

		w->warp(masks[i], K, cameras_[i].R, INTER_NEAREST, BORDER_CONSTANT, masks_warped[i]);
	}

	vector<UMat> images_warped_f(img_num_);
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img_num_; ++i)
		images_warped[i].convertTo(images_warped_f[i], CV_32F);

	// Find seams
	if (isExposeCompasate_)
		exposure_comp_->feed(corners, images_warped, masks_warped);

	seam_finder_->find(images_warped_f, corners, masks_warped);

	// Release unused memory
	seam_est_imgs_.clear();
	images_warped.clear();
	images_warped_f.clear();
	masks.clear();

	// -----------------------------composing--------------------------------
#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img_num_; ++i)
	{
		double compose_work_aspect = 1.0 / work_scale_;
		Ptr<detail::RotationWarper> w1 = warper_->create((float)(warped_image_scale_*compose_work_aspect));

		// Update intrinsics
		cameras_[i].focal *= compose_work_aspect;
		cameras_[i].ppx *= compose_work_aspect;
		cameras_[i].ppy *= compose_work_aspect;

		Mat K;
		cameras_[i].K().convertTo(K, CV_32F);
		Rect roi = w1->warpRoi(imgs_[i].size(), K, cameras_[i].R);
		corners[i] = roi.tl();
		sizes[i] = roi.size();
	}

	blender_->prepare(corners, sizes);

	//-------------------------blend过程非常耗时----------------------
#pragma omp parallel for schedule(dynamic)
	for (int img_idx = 0; img_idx < img_num_; ++img_idx)
	{
		UMat img_warped, img_warped_s;
		UMat dilated_mask, seam_mask, mask, mask_warped;

		double compose_work_aspect = 1.0 / work_scale_;
		Ptr<detail::RotationWarper> w2 = warper_->create((float)(warped_image_scale_*compose_work_aspect));

		Mat K;
		cameras_[img_idx].K().convertTo(K, CV_32F);

		// Warp the current image
		w2->warp(imgs_[img_idx], K, cameras_[img_idx].R, INTER_LINEAR, BORDER_REFLECT, img_warped);

		// Warp the current image mask
		mask.create(imgs_[img_idx].size(), CV_8U);
		mask.setTo(Scalar::all(255));
		w2->warp(mask, K, cameras_[img_idx].R, INTER_NEAREST, BORDER_CONSTANT, mask_warped);

		// Compensate exposure
		if (isExposeCompasate_)
			exposure_comp_->apply(img_idx, corners[img_idx], img_warped, mask_warped);

		img_warped.convertTo(img_warped_s, CV_16S);
		img_warped.release();
		mask.release();

		// Make sure seam mask has proper size
		dilate(masks_warped[img_idx], dilated_mask, Mat());
		resize(dilated_mask, seam_mask, mask_warped.size());

		bitwise_and(seam_mask, mask_warped, mask_warped);
// 		mask_warped = seam_mask & mask_warped;

		// Blend the current image
		blender_->feed(img_warped_s, mask_warped, corners[img_idx]);
	}

	UMat result, result_mask;
	blender_->blend(result, result_mask);

	// Preliminary result is in CV_16SC3 format, but all values are in [0,255] range,
	// so convert it to avoid user confusing
	result.convertTo(pano, CV_8U);

	return OK;

}


panoStitch::Status panoStitch::myComposePanorama(OutputArray pano)
{
	int64 tic = cvGetTickCount();
	int64 toc;

	vector<UMat> seam_est_imgs_;

	seam_est_imgs_.resize(img_num_);

	//step 1: 计算seam估计图像
	for (int i = 0; i < img_num_; ++i)
	{
		resize(imgs_[i], seam_est_imgs_[i], Size(), seam_scale_, seam_scale_);
	}

	vector<Point> corners(img_num_);
	vector<UMat> masks_warped(img_num_);
	vector<UMat> images_warped(img_num_);
	vector<Size> sizes(img_num_);
	vector<UMat> masks(img_num_);

	// Prepare image masks
	for (int i = 0; i < img_num_; ++i)
	{
		masks[i].create(seam_est_imgs_[i].size(), CV_8U);
		masks[i].setTo(Scalar::all(255));
	}


	// Warp images and their masks
	double seam_work_aspect_ = seam_scale_ / work_scale_;
	Ptr<detail::RotationWarper> w = warper_->create(float(warped_image_scale_ * seam_work_aspect_));
	for (int i = 0; i < img_num_; ++i)
	{

		Mat_<float> K;
		cameras_[i].K().convertTo(K, CV_32F);
		K(0, 0) *= (float)seam_work_aspect_;
		K(0, 2) *= (float)seam_work_aspect_;
		K(1, 1) *= (float)seam_work_aspect_;
		K(1, 2) *= (float)seam_work_aspect_;

		corners[i] = w->warp(seam_est_imgs_[i], K, cameras_[i].R, INTER_LINEAR, BORDER_REFLECT, images_warped[i]);//BORDER_REFLECT

		w->warp(masks[i], K, cameras_[i].R, INTER_NEAREST, BORDER_CONSTANT, masks_warped[i]);//BORDER_CONSTANT
	}

	vector<UMat> images_warped_f(img_num_);
	for (int i = 0; i < img_num_; ++i)
		images_warped[i].convertTo(images_warped_f[i], CV_32F);

	// Find seams
	if (isExposeCompasate_)
		exposure_comp_->feed(corners, images_warped, masks_warped);

	seam_finder_->find(images_warped_f, corners, masks_warped);

	// Release unused memory
	seam_est_imgs_.clear();
	images_warped.clear();
	images_warped_f.clear();
	masks.clear();

	toc = cvGetTickCount();
	std::cout << "seam finding time: " << ((double)(toc - tic) / getTickFrequency()) << " s. " << endl;
	tic = cvGetTickCount();
	// -----------------------------composing--------------------------------
	UMat img_warped, img_warped_s;
	UMat dilated_mask, seam_mask, mask, mask_warped;

	double compose_work_aspect = 1.0 / work_scale_;
	w = warper_->create((float)(warped_image_scale_*compose_work_aspect));

	for (int i = 0; i < img_num_; ++i)
	{
		// Update intrinsics
		cameras_[i].focal *= compose_work_aspect;
		cameras_[i].ppx *= compose_work_aspect;
		cameras_[i].ppy *= compose_work_aspect;

		Mat K;
		cameras_[i].K().convertTo(K, CV_32F);
		Rect roi = w->warpRoi(imgs_[i].size(), K, cameras_[i].R);
		corners[i] = roi.tl();
		sizes[i] = roi.size();
	}

	blender_->prepare(corners, sizes);

	//-------------------------blend过程非常耗时----------------------
	for (int img_idx = 0; img_idx < img_num_; ++img_idx)
	{
		Mat K;
		cameras_[img_idx].K().convertTo(K, CV_32F);

		// Warp the current image
		w->warp(imgs_[img_idx], K, cameras_[img_idx].R, INTER_LINEAR, BORDER_REFLECT, img_warped);//BORDER_REFLECT

		// Warp the current image mask
		mask.create(imgs_[img_idx].size(), CV_8U);
		mask.setTo(Scalar::all(255));
		w->warp(mask, K, cameras_[img_idx].R, INTER_NEAREST, BORDER_CONSTANT, mask_warped);//BORDER_CONSTANT

		// Compensate exposure
		if (isExposeCompasate_)
			exposure_comp_->apply(img_idx, corners[img_idx], img_warped, mask_warped);

		img_warped.convertTo(img_warped_s, CV_16S);
		img_warped.release();
		mask.release();

		// Make sure seam mask has proper size
		dilate(masks_warped[img_idx], dilated_mask, Mat());
		resize(dilated_mask, seam_mask, mask_warped.size());

// 		mask_warped = seam_mask & mask_warped;
		bitwise_and(seam_mask, mask_warped, mask_warped);

		// Blend the current image
		blender_->feed(img_warped_s, mask_warped, corners[img_idx]);
	}

	UMat result, result_mask;
	blender_->blend(result, result_mask);

	// Preliminary result is in CV_16SC3 format, but all values are in [0,255] range,
	// so convert it to avoid user confusing
	result.convertTo(pano, CV_8U);

	toc = cvGetTickCount();
	std::cout << "blender time: " << ((double)(toc - tic) / getTickFrequency()) << " s. " << endl;

	return OK;

}


void panoStitch::readCameraParams(const std::string& camera_path)
{
	cv::FileStorage fs;
	fs.open(camera_path+"/camera.xml", cv::FileStorage::READ); //

	cameras_.resize(0);

	if (fs.isOpened())//TODO:添加相机参数读取，需要标定端程序给出相机参数
	{
		cv::FileNode cameraInfos = fs["camera_param_list"];
		cv::FileNodeIterator it = cameraInfos.begin(), it_end = cameraInfos.end();
		for (; it != it_end;it++)
		{
			detail::CameraParams cam;
			(*it)["focal"] >> cam.focal;
			(*it)["aspect"] >> cam.aspect;

			vector<double> principle_pt;
			(*it)["principal"] >> principle_pt;

			cam.ppx = principle_pt[0]; cam.ppy = principle_pt[1];

			(*it)["rotMat"] >> cam.R;
			(*it)["transMat"] >> cam.t;

			cameras_.push_back(cam);
		}

		fs["work_scale"] >> work_scale_;
		fs["warped_image_scale"] >> warped_image_scale_;

		fs.release();
	}
	else
	{
		std::cout << "can not find the camera xml file!" << endl;
	}

}



