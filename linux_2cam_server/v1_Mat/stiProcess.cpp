#include "stiProcess.h"

StiProcess::StiProcess(const string&img_path, const string& cam_path, const string& common_path) :
_imgPath(img_path), _camPath(cam_path), _commonPath(common_path)
{
	cv::ocl::setUseOpenCL(false); //这句代码不能省略，否则错误

	//给定默认值
	_seamScale = 0.1;
	_blendLayer = 5;
}


StiProcess::~StiProcess()
{

}


Mat StiProcess::exec()
{
	if (readCommonParams())
	{
		if (readCalibParams())
		{			
			return execStitching();
		}
	}

	return Mat();
}


void StiProcess::setFusionArgs(float seam_scale, int blend_layer, bool isexp)
{
	_seamScale = seam_scale;
	_blendLayer = blend_layer;
	_isExposeComp = isexp;
}


Mat StiProcess::execStitching()
{
	int64 tic = cvGetTickCount();
	int64 toc;

	_sHDmapX.create(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
	_sHDmapY.create(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
	_correctImg.create(PIC_SIZE, PIC_SIZE * 2, IMG_FORMAT);

	_imgs.resize(IMG_NUM + 1);

	std::cout << "correcting begin ..." << endl;
	for (int i = 0; i < IMG_NUM; ++i)
	{
		if (!processSingle(i))
		{
			return Mat();
		}			
	}	

	//释放临时数组
	_sHDmapX.release(); _sHDmapY.release(); _correctImg.release();

	toc = cvGetTickCount();
	std::cout << "correcting accomplished, time elapsed: " + num2str<double>((double)(toc - tic) / getTickFrequency()) + " s. " << endl;

	//-------------stitch composepano-----------
	std::cout << "composing begin ..." << endl;
	tic = cvGetTickCount();

	Mat composPano;

	panoStitch mystitcher = panoStitch::creatDefault(true, _seamScale, _blendLayer);
	mystitcher.setExposeureState(_isExposeComp);
	mystitcher.stitcher(_imgs, composPano, _camPath);

	//释放内存
	for (int i = 0; i < IMG_NUM + 1; ++i)
		_imgs[i].release();

	_imgs.clear();

	//warp Image
	Mat warpPano;

	imgWarp(composPano, warpPano, Size(PIC_SIZE*2, PIC_SIZE), 300);

	toc = cvGetTickCount();
	std::cout << "composing accomplished, time elapsed: " + num2str<double>((double)(toc - tic) / getTickFrequency()) + " s. " << endl;

	return warpPano;
}


bool StiProcess::processSingle(int idx)
{
	//step 1: read map
	bool f1 = false, f2 = false;

	ifstream fmapx((_camPath + "/sHDmapX_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary);
	if (fmapx.is_open())
	{
		fmapx.read((char*)_sHDmapX.data, sizeof(float)*_sHDmapX.rows*_sHDmapX.cols);
		fmapx.close();
	}
	else
	{
		std::cout << "can not find the correct smap!" << endl;
		f1 = true;
	}

	ifstream fmapy((_camPath + "/sHDmapY_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary);
	if (fmapy.is_open())
	{
		fmapy.read((char*)_sHDmapY.data, sizeof(float)*_sHDmapY.rows*_sHDmapY.cols);
		fmapy.close();
	}
	else
	{
		std::cout << "can not find the correct smap!" << endl;
		f2 = true;
	}


	if (f1||f2)
	{
		if (!calcMapSingle(idx))
			return false;

		std::cout << "individual maps are recalculated!" << endl;

		ifstream fmapx((_camPath + "/sHDmapX_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary);
		if (fmapx.is_open())
		{
			fmapx.read((char*)_sHDmapX.data, sizeof(float)*_sHDmapX.rows*_sHDmapX.cols);
			fmapx.close();
		}

		ifstream fmapy((_camPath + "/sHDmapY_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary);
		if (fmapy.is_open())
		{
			fmapy.read((char*)_sHDmapY.data, sizeof(float)*_sHDmapY.rows*_sHDmapY.cols);
			fmapy.close();
		}
	
	}

	Mat srcImg = imread(_imgPath + "/Image" + num2str<int>(idx + 1) + ".jpg");
	if (srcImg.empty())
	{
		std::cout << "can not find the correct image!" << endl;
		return false;
	}

	remap(srcImg, _correctImg, _sHDmapX, _sHDmapY, IMG_INTER_METHOD);
	srcImg.release(); 

	Mat img = _correctImg.colRange(_correctImg.cols*_crop_ratio, _correctImg.cols*(1.0 - _crop_ratio));//.getUMat(ACCESS_READ);

	if (idx == 0)
	{
		_imgs[0] = img.colRange(img.cols*0.5, img.cols).clone();
		_imgs[IMG_NUM] = img.colRange(0, img.cols*0.5).clone();
	}
	else
	{
		_imgs[idx] = img.clone();
	}

	return true;
}


bool StiProcess::calcBaseMaps()
{
	if (readCommonParams())
	{
		int64 tic = cvGetTickCount();
		int64 toc;

		Mat HDmapX = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
		Mat HDmapY = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);

		calcStandardMap(Size2i(PIC_SIZE * 2, PIC_SIZE), HDmapX, HDmapY, _map_curve, _half_fov, PI_2, 0);

		//保存_map
		std::ofstream fmapx((_commonPath + "/HDmapX.bin").c_str(), std::ios::binary | std::ios::trunc);
		fmapx.write((char*)HDmapX.data, sizeof(float)*HDmapX.rows*HDmapX.cols);
		fmapx.close();

		std::ofstream fmapy((_commonPath + "/HDmapY.bin").c_str(), std::ios::binary | std::ios::trunc);
		fmapy.write((char*)HDmapY.data, sizeof(float)*HDmapY.rows*HDmapY.cols);
		fmapy.close();

		HDmapX.release(); HDmapY.release();

		toc = cvGetTickCount();
		std::cout << "calculating base maps accomplished: " + num2str<double>((double)(toc - tic) / getTickFrequency()) + " s. " << endl;
		return true;
	}

	return false;
}


bool StiProcess::calcMapSingle(int idx)
{
	Mat HDmapX = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
	Mat HDmapY = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);

	bool f1 = false, f2 = false;

	ifstream fmapx((_commonPath + "/HDmapX.bin").c_str(), std::ios::binary);
	if (fmapx.is_open())
	{
		fmapx.read((char*)HDmapX.data, sizeof(float)*HDmapX.rows*HDmapX.cols);
		fmapx.close();
	}
	else
	{
		std::cout << "can not find the correct bmap!" << endl;
		f1 = true;
	}

	ifstream fmapy((_commonPath + "/HDmapY.bin").c_str(), std::ios::binary);
	if (fmapy.is_open())
	{
		fmapy.read((char*)HDmapY.data, sizeof(float)*HDmapY.rows*HDmapY.cols);
		fmapy.close();
	}
	else
	{
		std::cout << "can not find the correct bmap!" << endl;
		f2 = true;
	}

	if (f1 || f2)
	{
		if (!calcBaseMaps())
			return false;

		std::cout << "base maps are recalculated!" << endl;

		ifstream fmapx((_commonPath + "/HDmapX.bin").c_str(), std::ios::binary);
		if (fmapx.is_open())
		{
			fmapx.read((char*)HDmapX.data, sizeof(float)*HDmapX.rows*HDmapX.cols);
			fmapx.close();
		}
		
		ifstream fmapy((_commonPath + "/HDmapY.bin").c_str(), std::ios::binary);
		if (fmapy.is_open())
		{
			fmapy.read((char*)HDmapY.data, sizeof(float)*HDmapY.rows*HDmapY.cols);
			fmapy.close();
		}		
	}

	Mat sHDmapX = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
	Mat sHDmapY = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);

	calcIndividualMap(HDmapX, HDmapY, sHDmapX, sHDmapY, _correct_params[idx].ang,
		_correct_params[idx].cx, _correct_params[idx].cy, _correct_params[idx].cr);

	HDmapX.release(); HDmapY.release();

	//保存_map
	ofstream fmapxs((_camPath + "/sHDmapX_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapxs.write((char*)sHDmapX.data, sizeof(float)*sHDmapX.rows*sHDmapX.cols);
	fmapxs.close();

	ofstream fmapys((_camPath + "/sHDmapY_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapys.write((char*)sHDmapY.data, sizeof(float)*sHDmapY.rows*sHDmapY.cols);
	fmapys.close();

	sHDmapX.release(); sHDmapY.release();

	std::cout << "calculating individual maps accomplished!" << endl;

	return true;
}


bool StiProcess::calcSingleMapsAll()
{
	if (readCommonParams() && readCalibParams())
	{
		int64 tic = cvGetTickCount();
		int64 toc;

		Mat HDmapX = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
		Mat HDmapY = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);

		bool f1 = false, f2 = false;

		ifstream fmapx((_commonPath + "/HDmapX.bin").c_str(), std::ios::binary);
		if (fmapx.is_open())
		{
			fmapx.read((char*)HDmapX.data, sizeof(float)*HDmapX.rows*HDmapX.cols);
			fmapx.close();
		}
		else
		{
			std::cout << "can not find the correct bmap!" << endl;
			f1 = true;
		}

		ifstream fmapy((_commonPath + "/HDmapY.bin").c_str(), std::ios::binary);
		if (fmapy.is_open())
		{
			fmapy.read((char*)HDmapY.data, sizeof(float)*HDmapY.rows*HDmapY.cols);
			fmapy.close();
		}
		else
		{
			std::cout << "can not find the correct bmap!" << endl;
			f2 = true;
		}

		if (f1 || f2)
		{
			if (!calcBaseMaps())
				return false;

			std::cout << "base maps are recalculated!" << endl;

			ifstream fmapx((_commonPath + "/HDmapX.bin").c_str(), std::ios::binary);
			if (fmapx.is_open())
			{
				fmapx.read((char*)HDmapX.data, sizeof(float)*HDmapX.rows*HDmapX.cols);
				fmapx.close();
			}

			ifstream fmapy((_commonPath + "/HDmapY.bin").c_str(), std::ios::binary);
			if (fmapy.is_open())
			{
				fmapy.read((char*)HDmapY.data, sizeof(float)*HDmapY.rows*HDmapY.cols);
				fmapy.close();
			}
		}

		Mat sHDmapX = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
		Mat sHDmapY = Mat::zeros(PIC_SIZE, PIC_SIZE * 2, CV_32FC1);
		for (int idx = 0; idx < IMG_NUM; ++idx)
		{
			calcIndividualMap(HDmapX, HDmapY, sHDmapX, sHDmapY, _correct_params[idx].ang,
				_correct_params[idx].cx, _correct_params[idx].cy, _correct_params[idx].cr);

			//保存_map
			ofstream fmapxs((_camPath + "/sHDmapX_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary | std::ios::trunc);
			fmapxs.write((char*)sHDmapX.data, sizeof(float)*sHDmapX.rows*sHDmapX.cols);
			fmapxs.close();

			ofstream fmapys((_camPath + "/sHDmapY_" + num2str<int>(idx + 1) + ".bin").c_str(), std::ios::binary | std::ios::trunc);
			fmapys.write((char*)sHDmapY.data, sizeof(float)*sHDmapY.rows*sHDmapY.cols);
			fmapys.close();
		}

		sHDmapX.release(); sHDmapY.release();
		HDmapX.release(); HDmapY.release();

		toc = cvGetTickCount();
		std::cout << "all individual maps calculating accomplished: " + num2str<double>((double)(toc - tic) / getTickFrequency()) + " s. " << endl;

		return true;
	}

	return false;
}


bool StiProcess::readCommonParams()
{
	//载入calibration参数
	FileStorage fp;
	fp.open((_commonPath + "/common.xml").c_str(), cv::FileStorage::READ);

	if (fp.isOpened())
	{		
		fp["correctCurve"] >> _map_curve;
		fp["halfFov"] >> _half_fov;
		_half_fov *= PI_OVER_180;
		fp["cropRatio"] >> _crop_ratio;

		fp.release();

		std::cout << "correct common parameters are loaded." << endl;

		return true;
	}
	else
	{
		std::cout << "can not find \"common.xml\" file!" << endl;
		return false;
	}
}


bool StiProcess::readCalibParams()
{
	//载入calibration参数
	FileStorage fp;
	fp.open((_camPath + "/calibration_2cam.xml").c_str(), cv::FileStorage::READ);

	if (fp.isOpened())
	{
		FileNode cnode = fp["imgParam"];
		FileNodeIterator iter = cnode.begin();
		FileNodeIterator iter_end = cnode.end();

		_correct_params.clear();

		for (; iter != iter_end; iter++)
		{
			ImgCorrectParams cp;

			vector<double> var;
			(*iter)["param1"] >> var;
			cp.cx = var[0]; cp.cy = var[1]; cp.cr = var[2];
			cp.ang = var[3] * PI_OVER_180; cp.tx = var[4]; cp.ty = var[5];
			_correct_params.push_back(cp);
			var.clear();

			(*iter)["param2"] >> var;
			cp.cx = var[0]; cp.cy = var[1]; cp.cr = var[2];
			cp.ang = var[3] * PI_OVER_180; cp.tx = var[4]; cp.ty = var[5];
			_correct_params.push_back(cp);
			var.clear();

		}

		fp.release();

		std::cout << "correct calibration parameters are loaded." << endl;

		return true;
	}
	else
	{
		std::cout << "can not find \"calibration_2cam.xml\" file!" << endl;
		return false;
	}
}


void StiProcess::one2six(InputArray srcImg, vector<Mat>& cube_imgs, bool writeflag)
{
	Mat src = srcImg.getMat();

	CV_Assert(src.size() == Size(PIC_SIZE * 2, PIC_SIZE));

	string matNames[6] = { "left", "right", "top", "bottom", "front", "back" };
	string imgNames[6] = { "negz", "posz", "posy", "negy", "negx", "posx" };

	cube_imgs.resize(6);

	for (int i = 0; i < 6; ++i)
	{
		Mat img = Mat::zeros(CUBE_RADIUS * 2, CUBE_RADIUS * 2, CV_8UC3);
		one2sixMapping(srcImg, img, matNames[i]);
		cube_imgs[i] = img;

		if (writeflag)
		{
			imwrite(_imgPath + "/" +imgNames[i] + ".jpg", cube_imgs[i]);
		}
	}
}


void StiProcess::one2sixMapping(InputArray srcImg, OutputArray dstImg, const string mapName)
{
	ifstream imapx, imapy;

	bool f1 = false, f2 = false;

	Mat mapx = Mat::zeros(CUBE_RADIUS * 2, CUBE_RADIUS * 2, CV_32FC1);
	Mat mapy = Mat::zeros(CUBE_RADIUS * 2, CUBE_RADIUS * 2, CV_32FC1);

	imapx.open((_commonPath + "/map_" + mapName + "_x.bin").c_str(), std::ios::binary);
	if (imapx.is_open())
	{
		imapx.read((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
		imapx.close();
	}
	else
	{
		std::cout << "can not find the cube map!" << endl;
		f1 = true;
	}

	imapy.open((_commonPath + "/map_" + mapName + "_y.bin").c_str(), std::ios::binary);
	if (imapy.is_open())
	{
		imapy.read((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
		imapy.close();
	}
	else
	{
		std::cout << "can not find the cube map!" << endl;
		f2 = true;
	}

	if (f1 || f2)
	{
		calcOne2sixMap();

		std::cout << "cube maps are recalculated!" << endl;

		imapx.open((_commonPath + "/map_" + mapName + "_x.bin").c_str(), std::ios::binary);
		if (imapx.is_open())
		{
			imapx.read((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
			imapx.close();
		}
		
		imapy.open((_commonPath + "/map_" + mapName + "_y.bin").c_str(), std::ios::binary);
		if (imapy.is_open())
		{
			imapy.read((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
			imapy.close();
		}	
	}

	remap(srcImg, dstImg, mapx, mapy, IMG_INTER_METHOD);

	mapx.release(); mapy.release();
}


void StiProcess::calcOne2sixMap()
{
	ofstream fmapx, fmapy;	

	int dstWidth = CUBE_RADIUS * 2;
	int dstHeight = CUBE_RADIUS * 2;
	
	Mat mapx = Mat::zeros(CUBE_RADIUS * 2, CUBE_RADIUS * 2, CV_32FC1);
	Mat mapy = Mat::zeros(CUBE_RADIUS * 2, CUBE_RADIUS * 2, CV_32FC1);

	//left
#pragma omp parallel for schedule(dynamic)
	for (int y = 0; y < dstHeight; y++)
	{
		for (int x = 0; x < dstWidth; x++)
		{
			double srcWidth = PIC_SIZE * 2;
			double srcHeight = PIC_SIZE;

			double px, py;
			double ag1, ag2;

			ag2 = atan2(x - (double)CUBE_RADIUS, (double)CUBE_RADIUS) + PI + PI_2;
			if (ag2 < 0) {
				ag2 += PI2;
			}
			px = ag2 / PI2*srcWidth;

			ag1 = PI_2 - atan2(y - (double)CUBE_RADIUS, (double)CUBE_RADIUS / fabs(sin(ag2)));
			py = srcHeight - ag1 / PI*srcHeight;

			px = px > 0 ? px : 0; px = px < srcWidth - 1 ? px : srcWidth - 1;
			py = py > 0 ? py : 0; py = py < srcHeight - 1 ? py : srcHeight - 1;

			mapx.at<float>(y, x) = px;
			mapy.at<float>(y, x) = py;

		}
	}

	fmapx.open((_commonPath + "/map_left_x.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapx.write((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
	fmapx.close();

	fmapy.open((_commonPath + "/map_left_y.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapy.write((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
	fmapy.close();

	//right
#pragma omp parallel for schedule(dynamic)
	for (int y = 0; y < dstHeight; y++)
	{
		for (int x = 0; x < dstWidth; x++)
		{
			double srcWidth = PIC_SIZE * 2;
			double srcHeight = PIC_SIZE;

			double px, py;
			double ag1, ag2;

			ag2 = atan2(x - (double)CUBE_RADIUS, (double)CUBE_RADIUS) + PI_2;
			px = ag2 / PI2*srcWidth;

			ag1 = -atan2(y - (double)CUBE_RADIUS, (double)CUBE_RADIUS / fabs(sin(ag2)));
			py = srcHeight - (0.5 + ag1 / PI)*srcHeight;

			px = px > 0 ? px : 0; px = px < srcWidth - 1 ? px : srcWidth - 1;
			py = py > 0 ? py : 0; py = py < srcHeight - 1 ? py : srcHeight - 1;

			mapx.at<float>(y, x) = px;
			mapy.at<float>(y, x) = py;
		}
	}

	fmapx.open((_commonPath + "/map_right_x.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapx.write((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
	fmapx.close();

	fmapy.open((_commonPath + "/map_right_y.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapy.write((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
	fmapy.close();

	//top
#pragma omp parallel for schedule(dynamic)
	for (int y = 0; y < dstHeight; y++)
	{
		for (int x = 0; x < dstWidth; x++)
		{
			double srcWidth = PIC_SIZE * 2;
			double srcHeight = PIC_SIZE;

			double px, py;
			double ag1, ag2;

			if (x <= (double)CUBE_RADIUS) 
			{
				if (y <= (double)CUBE_RADIUS) 
					ag2 = PI_2 + atan2((double)CUBE_RADIUS - y, (double)CUBE_RADIUS - x);
				else	   
					ag2 = atan2((double)CUBE_RADIUS - x, y - (double)CUBE_RADIUS);
			}
			else
			{
				if (y <= (double)CUBE_RADIUS) 
					ag2 = PI + atan2(x - (double)CUBE_RADIUS, (double)CUBE_RADIUS - y);
				else       
					ag2 = PI + PI_2 + atan2(y - (double)CUBE_RADIUS, x - (double)CUBE_RADIUS);
			}
			px = srcWidth - ag2 / PI2*srcWidth;

			ag1 = atan2(hypot(x - (double)CUBE_RADIUS, y - (double)CUBE_RADIUS), (double)CUBE_RADIUS);
			py = ag1 / PI*srcHeight;

			px = px > 0 ? px : 0; px = px < srcWidth - 1 ? px : srcWidth - 1;
			py = py > 0 ? py : 0; py = py < srcHeight - 1 ? py : srcHeight - 1;

			mapx.at<float>(y, x) = px;
			mapy.at<float>(y, x) = py;
		}
	}

	fmapx.open((_commonPath + "/map_top_x.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapx.write((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
	fmapx.close();

	fmapy.open((_commonPath + "/map_top_y.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapy.write((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
	fmapy.close();

	//bottom
#pragma omp parallel for schedule(dynamic)
	for (int y = 0; y < dstHeight; y++)
	{
		for (int x = 0; x < dstWidth; x++)
		{
			double srcWidth = PIC_SIZE * 2;
			double srcHeight = PIC_SIZE;

			double px, py;
			double ag1, ag2;

			if (x <= (double)CUBE_RADIUS) 
			{
				if (y <= (double)CUBE_RADIUS)
					ag2 = PI + PI_2 + atan2((double)CUBE_RADIUS - y, (double)CUBE_RADIUS - x);
				else	   
					ag2 = PI + atan2((double)CUBE_RADIUS - x, y - (double)CUBE_RADIUS);
			}
			else
			{
				if (y <= (double)CUBE_RADIUS)
					ag2 = atan2(x - (double)CUBE_RADIUS, (double)CUBE_RADIUS - y);
				else       
					ag2 = PI_2 + atan2(y - (double)CUBE_RADIUS, x - (double)CUBE_RADIUS);
			}
			px = ag2 / PI2*srcWidth;

			ag1 = atan2(hypot(x - (double)CUBE_RADIUS, y - (double)CUBE_RADIUS), (double)CUBE_RADIUS);
			py = srcHeight - ag1 / PI*srcHeight;

			px = px > 0 ? px : 0; px = px < srcWidth - 1 ? px : srcWidth - 1;
			py = py > 0 ? py : 0; py = py < srcHeight - 1 ? py : srcHeight - 1;

			mapx.at<float>(y, x) = px;
			mapy.at<float>(y, x) = py;
		}
	}

	fmapx.open((_commonPath + "/map_bottom_x.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapx.write((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
	fmapx.close();

	fmapy.open((_commonPath + "/map_bottom_y.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapy.write((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
	fmapy.close();

	//front
#pragma omp parallel for schedule(dynamic)
	for (int y = 0; y < dstHeight; y++)
	{
		for (int x = 0; x < dstWidth; x++)
		{
			double srcWidth = PIC_SIZE * 2;
			double srcHeight = PIC_SIZE;

			double px, py;
			double ag1, ag2;

			ag2 = atan2(x - (double)CUBE_RADIUS, (double)CUBE_RADIUS);
			if (ag2 < 0) 
			{
				ag2 += PI2;
			}
			px = ag2 / PI2*srcWidth;

			ag1 = PI_2 - atan2(y - (double)CUBE_RADIUS, (double)CUBE_RADIUS / fabs(cos(ag2)));
			py = srcHeight - ag1 / PI*srcHeight;

			px = px > 0 ? px : 0; px = px < srcWidth - 1 ? px : srcWidth - 1;
			py = py > 0 ? py : 0; py = py < srcHeight - 1 ? py : srcHeight - 1;

			mapx.at<float>(y, x) = px;
			mapy.at<float>(y, x) = py;
		}
	}

	fmapx.open((_commonPath + "/map_front_x.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapx.write((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
	fmapx.close();

	fmapy.open((_commonPath + "/map_front_y.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapy.write((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
	fmapy.close();

	//back
#pragma omp parallel for schedule(dynamic)
	for (int y = 0; y < dstHeight; y++)
	{
		for (int x = 0; x < dstWidth; x++)
		{
			double srcWidth = PIC_SIZE * 2;
			double srcHeight = PIC_SIZE;

			double px, py;
			double ag1, ag2;

			ag2 = atan2(x - (double)CUBE_RADIUS, (double)CUBE_RADIUS) + PI;
			px = ag2 / PI2*srcWidth;

			ag1 = PI_2 - atan2(y - (double)CUBE_RADIUS, (double)CUBE_RADIUS / fabs(cos(ag2)));
			py = srcHeight - ag1 / PI*srcHeight;

			px = px > 0 ? px : 0; px = px < srcWidth - 1 ? px : srcWidth - 1;
			py = py > 0 ? py : 0; py = py < srcHeight - 1 ? py : srcHeight - 1;

			mapx.at<float>(y, x) = px;
			mapy.at<float>(y, x) = py;
		}
	}

	fmapx.open((_commonPath + "/map_back_x.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapx.write((char*)mapx.data, sizeof(float)*mapx.rows*mapx.cols);
	fmapx.close();

	fmapy.open((_commonPath + "/map_back_y.bin").c_str(), std::ios::binary | std::ios::trunc);
	fmapy.write((char*)mapy.data, sizeof(float)*mapy.rows*mapy.cols);
	fmapy.close();

	mapx.release(); mapy.release();

}



