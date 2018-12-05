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


	return status;
}


panoStitch::Status panoStitch::myComposePanorama(OutputArray pano)
{
	//相机参数是否合理，需要做检查
#if 0
	for (int i = 0; i < imgs_.size(); ++i)
	{
		if (isnan<double>((double)cameras_[i].focal) || isnan<double>((double)cameras_[i].ppx) ||
			isnan<double>((double)cameras_[i].ppy) || isnan<double>((double)cameras_[i].aspect))
		{
			LOGLN("INNALID camera parameters occerd!");

			return ERR_INVALID_CAMERA_PARAM;
		}

		Mat R = cameras_[i].R;

		for (int m = 0; m < R.rows; ++m)
		{
			for (int n = 0; n < R.cols; ++n)
			{
				if (isnan<double>(R.at<double>(m, n)))
				{
					LOGLN("INNALID camera parameters occerd!");

					return ERR_INVALID_CAMERA_PARAM;
				}
			}
		}
	}
#endif

#if ENABLE_LOG
	LOGLN("Warping images (auxiliary)... ");
	int64 t = getTickCount();
#endif

	//尺度参数放到一起好处理
	double tmp_work_scale = work_scale_*0.5;
	double seam_work_aspect = seam_scale_ / tmp_work_scale;
	double compose_scale = 1;
	double compose_work_aspect = compose_scale / tmp_work_scale;

	vector<Point> corners(imgs_.size());
	vector<Mat> masks_warped(imgs_.size());
	vector<Mat> images_warped(imgs_.size());
	vector<Size> sizes(imgs_.size());
	vector<Mat> masks(imgs_.size());

	// prepare seam imgs
	vector<Mat> seam_est_imgs(imgs_.size());
	for (int i = 0; i < imgs_.size(); ++i)
	{
		resize(imgs_[i], seam_est_imgs[i], Size(), seam_scale_, seam_scale_);
	}

	// Prepare image masks
	for (int i = 0; i < imgs_.size(); ++i)
	{
		masks[i].create(seam_est_imgs[i].size(), CV_8U);
		masks[i].setTo(Scalar::all(255));
	}

	// Warp images and their masks
	Ptr<detail::RotationWarper> w = warper_->create(float(warped_image_scale_ * seam_work_aspect));
	for (int i = 0; i < imgs_.size(); ++i)
	{
		Mat_<float> K;
		cameras_[i].K().convertTo(K, CV_32F);
		K(0, 0) *= (float)seam_work_aspect;//focus
		K(0, 2) *= (float)seam_work_aspect;//focus
		K(1, 1) *= (float)seam_work_aspect;//主点x
		K(1, 2) *= (float)seam_work_aspect;//主点y

		corners[i] = w->warp(seam_est_imgs[i], K, cameras_[i].R, INTER_LINEAR, BORDER_REFLECT, images_warped[i]);

		w->warp(masks[i], K, cameras_[i].R, INTER_NEAREST, BORDER_CONSTANT, masks_warped[i]);
	}

	vector<Mat> images_warped_f(imgs_.size());
	for (int i = 0; i < imgs_.size(); ++i)
		images_warped[i].convertTo(images_warped_f[i], CV_32F);

#if ENABLE_LOG
	LOGLN("Warping images, time: " << ((getTickCount() - t) / getTickFrequency()) << " sec");
#endif

	if (isExposeCompasate_)
		exposure_comp_->feed(corners, images_warped, masks_warped);

	// Find seams
	seam_finder_->find(images_warped_f, corners, masks_warped);

	// Release unused memory
	seam_est_imgs.clear();
	images_warped.clear();
	images_warped_f.clear();
	masks.clear();


#if ENABLE_LOG
	LOGLN("Compositing...");
	t = getTickCount();
#endif


	w = warper_->create(float(warped_image_scale_ * compose_work_aspect));

	// Update corners and sizes
	for (int i = 0; i < imgs_.size(); ++i)
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

	Mat img_warped, img_warped_s;
	Mat dilated_mask, seam_mask, mask, mask_warped;

	for (int i = 0; i < imgs_.size(); ++i)
	{
#if ENABLE_LOG
		LOGLN("Compositing image #" << i + 1);
#endif

		Mat K;
		cameras_[i].K().convertTo(K, CV_32F);

		// Warp the current image
		w->warp(imgs_[i], K, cameras_[i].R, INTER_LINEAR, BORDER_REFLECT, img_warped);

		// Warp the current image mask
		mask.create(imgs_[i].size(), CV_8U);
		mask.setTo(Scalar::all(255));
		// 		Mat mask_warped1;
		w->warp(mask, K, cameras_[i].R, INTER_NEAREST, BORDER_CONSTANT, mask_warped);

		// Compensate exposure
		if (isExposeCompasate_)
			exposure_comp_->apply((int)i, corners[i], img_warped, mask_warped);

		img_warped.convertTo(img_warped_s, CV_16S);
		img_warped.release();
		mask.release();

		// Make sure seam mask has proper size
		dilate(masks_warped[i], dilated_mask, Mat());
		resize(dilated_mask, seam_mask, mask_warped.size());

// 		mask_warped = seam_mask & mask_warped;
		bitwise_and(seam_mask, mask_warped, mask_warped);

		// Blend the current image
		blender_->feed(img_warped_s, mask_warped, corners[i]);
	}

	Mat result, result_mask;
	blender_->blend(result, result_mask);

#if ENABLE_LOG
	LOGLN("Compositing, time: " << ((getTickCount() - t) / getTickFrequency()) << " sec");
#endif

	// Preliminary result is in CV_16SC3 format, but all values are in [0,255] range,
	// so convert it to avoid user confusing
	result.convertTo(pano, CV_8U);

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



