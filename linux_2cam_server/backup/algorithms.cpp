#include "algorithms.h"



void fisheyeImgCrop(InputArray in, int cx, int cy, int cr, OutputArray out)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();

	CV_Assert(!img.empty());

	int left_x = cx - cr > 0 ? cx - cr : 0;
	int left_y = cy - cr > 0 ? cy - cr : 0;

	int right_x = cx + cr < img.cols ? cx + cr : img.cols - 1;
	int right_y = cy + cr < img.rows ? cy + cr : img.rows - 1;

	int width = right_x - left_x;
	int height = right_y - left_y;

	cv::Mat tmp = img(cv::Rect(left_x, left_y, width, height));	//得到裁剪的包括鱼眼圆的子图像

	//确保拷贝到目标图像的正确位置（圆心应位于目标图像中心）
	int trans_x = cx < cr ? cx : cr;
	int trans_y = cy < cr ? cy : cr;

	tmp.copyTo(img_out(cv::Rect(cr - trans_x, cr - trans_y, width, height)));
}


void fisheyeImgRotate(InputArray in, float angle, OutputArray out)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();
	
	CV_Assert(!img.empty());

// 	Mat tmp = Mat::zeros(img.size(), img.type());
// 	tmp = img.clone();

	Point2f center((float)img.cols / 2.f, (float)img.rows / 2.f);
	Mat rotateMat = getRotationMatrix2D(center, angle, 1.0);

	warpAffine(img, img_out, rotateMat, img_out.size(), CV_INTER_CUBIC);

}

//======================================计算映射表==========================

//surround img 校正， 不含平移
void calcCorrectMap(Size2i size, OutputArray mapX, OutputArray mapY, float mapCurve, float fovRatio, float half_fov, float lat_angle, float lon_angle)
{
	int width = size.width, height = size.height;

	Mat mapX_out = mapX.getMatRef();
	Mat mapY_out = mapY.getMatRef();

	float R = (float)height / 2;

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //维度
	{
		float latitude = (float)(i) / height*PI;
		for (int j = 0; j < width; ++j) //经度
		{
			float longitude = (float)(width - j) / width*PI2 - PI_2 + lon_angle;
// 			float longitude = (float)(j) / width*PI2 + lon_angle;
			float lat_out, lon_out;

			sphericalTrans(latitude, longitude, Vec3f(1, 0, 0), lat_angle, lat_out, lon_out);

			//如何微调r?应根据相机光学模型来设计，等距投影
// 			float r = lat_out / half_fov*R;

			float r = (1.0 - powf(1.0 - lat_out / half_fov, mapCurve))*fovRatio*R;

			float x = r*cosf(lon_out);
			float y = r*sinf(lon_out);

			x += R;
			y += R;

			mapX_out.at<float>(i, j) = x;
			mapY_out.at<float>(i, j) = y;
		}
	}
}

//top img 校正， 不含平移
void calcCorrectMapTop(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov)
{
	int width = size.width, height = size.height;

	Mat mapX_out = mapX.getMatRef();
	Mat mapY_out = mapY.getMatRef();

	float R = (float)height / 2;

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //维度
	{
		float latitude = (float)(i) / height*PI;
		for (int j = 0; j < width; ++j) //经度
		{
			float longitude = (float)(width - j) / width*PI2 - PI_2;

			//如何微调r?应根据相机光学模型来设计，等距投影
			// 			float r = latitude / half_fov*R;
			float r = (1.0 - powf(1.0 - latitude / half_fov, mapCurve))*fovRatio*R;

			float x = r*cosf(longitude);
			float y = r*sinf(longitude);

			x += R;
			y += R;

			mapX_out.at<float>(i, j) = x;
			mapY_out.at<float>(i, j) = y;
		}
	}
}


//生成标准归一化非中心的公共_map
void calcStandardMap(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov, double lat_angle, double lon_angle)
{
	int width = size.width, height = size.height;

	Mat mapX_out = mapX.getMatRef();
	Mat mapY_out = mapY.getMatRef();

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //维度
	{
		float latitude = (float)(i) / height*PI;
		for (int j = 0; j < width; ++j) //经度
		{
			float longitude = (float)(width - j) / width*PI2 - PI_2 + lon_angle;
			float lat_out, lon_out;

			sphericalTrans(latitude, longitude, Vec3f(1, 0, 0), lat_angle, lat_out, lon_out);

			//如何微调r?应根据相机光学模型来设计，等距投影
// 			float r = lat_out / half_fov*R;

			float r = (1.0 - powf(1.0 - lat_out / half_fov, mapCurve))*fovRatio;

			float x = r*cosf(lon_out);
			float y = r*sinf(lon_out);

			mapX_out.at<float>(i, j) = x;
			mapY_out.at<float>(i, j) = y;
		}
	}
}


void calcStandardMapTop(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov)
{
	int width = size.width, height = size.height;

	Mat mapX_out = mapX.getMatRef();
	Mat mapY_out = mapY.getMatRef();

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //维度
	{
		float latitude = (float)(i) / height*PI;
		for (int j = 0; j < width; ++j) //经度
		{
			float longitude = (float)(width - j) / width*PI2 - PI_2;

			//如何微调r?应根据相机光学模型来设计，等距投影
// 			float r = latitude / half_fov*R;
			float r = (1.0 - powf(1.0 - latitude / half_fov, mapCurve))*fovRatio;

			float x = r*cosf(longitude);
			float y = r*sinf(longitude);

			mapX_out.at<float>(i, j) = x;
			mapY_out.at<float>(i, j) = y;
		}
	}
}


//根据标准_map生成针对图像个性化的校正_map
void calcIndividualMap(InputArray mapXIn, InputArray mapYIn, OutputArray mapXOut, OutputArray mapYOut, double angle, double centerX, double centerY, double R)
{
	CV_Assert(!mapXIn.empty() && mapXIn.channels() == 1 && !mapYIn.empty() && mapYIn.channels() == 1);

	Mat mapX = mapXIn.getMat();
	Mat mapY = mapYIn.getMat();
	Mat mapX_out = mapXOut.getMatRef();
	Mat mapY_out = mapYOut.getMatRef();


	float cos_ang = cos(-angle);
	float sin_ang = sin(-angle);

	int width = mapX.cols, height = mapX.rows;

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //维度
	{
		for (int j = 0; j < width; ++j) //经度
		{
			float x = mapX.at<float>(i, j);
			float y = mapY.at<float>(i, j);

			float x_ = x*cos_ang + y*sin_ang;
			float y_ = -x*sin_ang + y*cos_ang;

			x_ *= R;
			y_ *= R;

			x_ += centerX;
			y_ += centerY;
			
			mapX_out.at<float>(i, j) = x_;
			mapY_out.at<float>(i, j) = y_;
		}
	}
}


void imgHorizontalMove(InputArray in, OutputArray out, int mov)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();

	CV_Assert(!img.empty());

	int t = mov%img.cols;

	if (t==0)
	{
		img.copyTo(img_out);
		return;
	}

	if (t > 0)
	{
		img.colRange(img.cols - t, img.cols).copyTo(img_out.colRange(0, t));
		img.colRange(0, img.cols - t).copyTo(img_out.colRange(t, img_out.cols));
	}
	else
	{
		t = -t;
		img.colRange(t, img.cols).copyTo(img_out.colRange(0, img.cols - t));
		img.colRange(0, t).copyTo(img_out.colRange(img_out.cols - t, img_out.cols));
	}
	
}


void imgHorizontalMove(Mat& img, int mov)
{
	CV_Assert(!img.empty());

	int t = mov%img.cols;

	if (t == 0)
	{
		return;
	}

	Mat tmp(img.size(), img.type());

	if (t > 0)
	{
		img.colRange(img.cols - t, img.cols).copyTo(tmp.colRange(0, t));
		img.colRange(0, img.cols - t).copyTo(tmp.colRange(t, tmp.cols));
	}
	else
	{
		t = -t;
		img.colRange(t, img.cols).copyTo(tmp.colRange(0, img.cols - t));
		img.colRange(0, t).copyTo(tmp.colRange(tmp.cols - t, tmp.cols));
	}

	img = tmp;

}


void imgVerticalMove(InputArray in, OutputArray out, int mov)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();

	CV_Assert(!img.empty());

	int t = mov%img.rows;

	if (t == 0)
	{
		img.copyTo(img_out);
		return;
	}

	if (t > 0)
	{
		img.rowRange(img.rows - t, img.rows).copyTo(img_out.rowRange(0, t));
		img.rowRange(0, img.rows - t).copyTo(img_out.rowRange(t, img_out.rows));
	}
	else
	{
		t = -t;
		img.rowRange(t, img.rows).copyTo(img_out.rowRange(0, img.rows - t));
		img.rowRange(0, t).copyTo(img_out.rowRange(img_out.rows - t, img_out.rows));
	}
}


void imgVerticalMove(Mat& img, int mov)
{
	CV_Assert(!img.empty());

	int t = mov%img.rows;

	if (t == 0)
	{
		return;
	}

	Mat tmp(img.size(), img.type());

	if (t > 0)
	{
		img.rowRange(img.rows - t, img.rows).copyTo(tmp.rowRange(0, t));
		img.rowRange(0, img.rows - t).copyTo(tmp.rowRange(t, tmp.rows));
	}
	else
	{
		t = -t;
		img.rowRange(t, img.rows).copyTo(tmp.rowRange(0, img.rows - t));
		img.rowRange(0, t).copyTo(tmp.rowRange(tmp.rows - t, tmp.rows));
	}

	img = tmp;
}


void imgMove(InputArray in, OutputArray out, int movx, int movy)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();

	Mat tmp = Mat::zeros(img.size(), img.type());

	imgHorizontalMove(img, tmp, movx);
	imgVerticalMove(tmp, img_out, movy);
}


void imgMove(Mat& img, int movx, int movy)
{
	imgHorizontalMove(img, movx);
	imgVerticalMove(img, movy);
}


void imgMaskFilter(InputArray in, InputArray mask, OutputArray out)
{
	Mat img, HDSurMask, img_out;
	img = in.getMat();
	HDSurMask = mask.getMat();
	img_out = out.getMatRef();

	CV_Assert(!img.empty() && HDSurMask.channels() == 1);

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img_out.rows; ++i)
	{
		const float one_over_255 = 0.003921568;
		for (int j = 0; j < img_out.cols; ++j)
		{
			img_out.at<Vec3b>(i, j) = img.at<Vec3b>(i,j)*(HDSurMask.at<uchar>(i, j)*one_over_255);
		}
	}
}


void imgMaskFilter(Mat& img, InputArray mask)
{
	const float one_over_255 = 0.003921568;

	Mat HDSurMask = mask.getMat();

	CV_Assert(!img.empty() && HDSurMask.channels() == 1);

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < img.rows; ++i)
	{
		for (int j = 0; j < img.cols; ++j)
		{
			img.at<Vec3b>(i, j) *= (HDSurMask.at<uchar>(i, j)*one_over_255);
		}
	}
}


void imgSlopeEdgeHorizon(InputArray in, int startLine, int edgeWidth, int dir, OutputArray out)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();

	CV_Assert(startLine >= 0 && startLine < img.cols && edgeWidth>0);

	img.copyTo(img_out);

	if (dir >= 0) //向右生成斜坡边缘
	{
		int start = startLine;
		int end = start + edgeWidth < img.cols ? start + edgeWidth : img.cols;

		for (int i = start+1; i <= end; ++i)
		{
			float decay = (float)(i - start) / edgeWidth;
			img_out.col(i) = img.col(i)*(1 - decay);
		}
	}
	else  //向左生成斜坡边缘
	{
		int start = startLine;
		int end = start - edgeWidth > 0 ? start - edgeWidth : 0;

		for (int i = start-1; i >= end; --i)
		{
			float decay = (float)(start - i) / edgeWidth;
			img_out.col(i) = img.col(i)*(1 - decay);
		}
	}


}


void imgSlopeEdgeVertical(InputArray in, int startLine, int edgeWidth, int dir, OutputArray out)
{
	Mat img, img_out;
	img = in.getMat();
	img_out = out.getMatRef();

	CV_Assert(startLine >= 0 && startLine < img.rows && edgeWidth>0);

	img.copyTo(img_out);

	if (dir >= 0) //向下生成斜坡边缘
	{
		int start = startLine;
		int end = start + edgeWidth < img.rows ? start + edgeWidth : img.rows;

		for (int i = start + 1; i <= end; ++i)
		{
			float decay = (float)(i - start) / edgeWidth;
			img_out.row(i) = img.row(i)*(1 - decay);
		}
	}
	else  //向上生成斜坡边缘
	{
		int start = startLine;
		int end = start - edgeWidth > 0 ? start - edgeWidth : 0;

		for (int i = start - 1; i >= end; --i)
		{
			float decay = (float)(start - i) / edgeWidth;
			img_out.row(i) = img.row(i)*(1 - decay);
		}
	}


}


void imgSlopeEdge(InputArray in, int startLine, int fuseRadius, LineDir dir, OutputArray out)
{
	Mat src = in.getMat();

	CV_Assert(src.channels() == 1 && fuseRadius>=0);

	Mat mask = out.getMatRef();

	src.copyTo(mask);

	switch (dir)
	{
	case VERTICAL_LEFT:
	{
		CV_Assert(startLine >= 0 && startLine < src.cols);

		int start = startLine - fuseRadius > 0 ? startLine - fuseRadius : 0;
		int end = startLine + fuseRadius < mask.cols - 1 ? startLine + fuseRadius : mask.cols - 1;

		mask.colRange(0, start).setTo(Scalar(0));

// #pragma omp parallel for schedule(dynamic)
		for (int i = start; i <= end;++i)
		{
			double weight = 0.5 - (double)(startLine-i) / (2 * (fuseRadius + 1));
			mask.col(i) = src.col(i) * weight;
		}
		break;
	}
		
	case VERTICAL_RIGHT:
	{
		CV_Assert(startLine >= 0 && startLine < src.cols);

		int start = startLine - fuseRadius > 0 ? startLine - fuseRadius : 0;
		int end = startLine + fuseRadius < mask.cols - 1 ? startLine + fuseRadius : mask.cols - 1;

		mask.colRange(end + 1, mask.cols).setTo(Scalar(0));

// #pragma omp parallel for schedule(dynamic)
		for (int i = start; i <= end; ++i)
		{
			double weight = 0.5 + (double)(startLine - i) / (2 * (fuseRadius + 1));
			mask.col(i) = src.col(i) * weight;
		}
		break;
	}
	case HORIZONTAL_UP:
	{
		CV_Assert(startLine >= 0 && startLine < src.rows);

		int start = startLine - fuseRadius > 0 ? startLine - fuseRadius : 0;
		int end = startLine + fuseRadius < mask.rows - 1 ? startLine + fuseRadius : mask.rows - 1;

		mask.rowRange(0, start).setTo(Scalar(0));

// #pragma omp parallel for schedule(dynamic)
		for (int i = start; i <= end; ++i)
		{
			double weight = 0.5 - (double)(startLine - i) / (2 * (fuseRadius + 1));
			mask.row(i) = src.row(i) * weight;
		}
		break;
	}
	case HORIZONTAL_DOWN:
	{
		CV_Assert(startLine >= 0 && startLine < src.rows);

		int start = startLine - fuseRadius > 0 ? startLine - fuseRadius : 0;
		int end = startLine + fuseRadius < mask.rows - 1 ? startLine + fuseRadius : mask.rows - 1;

		mask.rowRange(end + 1, mask.rows).setTo(Scalar(0));

// #pragma omp parallel for schedule(dynamic)
		for (int i = start; i <= end; ++i)
		{
			double weight = 0.5 + (double)(startLine - i) / (2 * (fuseRadius + 1));
			mask.row(i) = src.row(i) * weight;
		}
		break;
	}

	}

}


void generateGaussKernel(float delta, int R, float*gaussKernel)
{
	float sum = 0;
	float delta_2 = delta*delta;

	for (int i = -R; i <= R; ++i)
	{
		gaussKernel[i + R] = expf(-i*i / (delta_2 * 2));
		sum += gaussKernel[i + R];
	}

	for (int i = 0; i < 2 * R + 1; ++i)
	{
		gaussKernel[i] /= sum;
	}
}


void imgFuser(InputArray in, OutputArray out, Size2i size, int pos1, int pos2, float delta, bool gaussf)
{
	vector<Mat> imgs;
	in.getMatVector(imgs);

	Mat pano = out.getMatRef();

	Mat left_1 = imgs[0].colRange(0, imgs[0].cols / 2);
	Mat right_1 = imgs[0].colRange(imgs[0].cols / 2, imgs[0].cols);

	Mat left_2 = imgs[1].colRange(0, imgs[1].cols / 2).clone();
	Mat right_2 = imgs[1].colRange(imgs[1].cols / 2, imgs[1].cols);

	int fuse_zone = (imgs[0].cols - imgs[0].rows);

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < fuse_zone; ++i)
	{
		float w = ((float)i / (fuse_zone-1));

		left_1.col(i) *= w;
		left_2.col(i) *= w;

		right_1.col(right_1.cols - i - 1) *= w;
		right_2.col(right_1.cols - i - 1) *= w;
	}

	Mat fuse1 = Mat::zeros(size, IMG_FORMAT);
	Mat fuse2 = Mat::zeros(size, IMG_FORMAT);

	right_1.copyTo(fuse1.colRange(0, right_1.cols));
	left_2.copyTo(fuse2.colRange(fuse2.cols - left_2.cols, fuse2.cols));

	Mat pano_left = fuse1 + fuse2;

	Mat fuse3 = Mat::zeros(size, IMG_FORMAT);
	Mat fuse4 = Mat::zeros(size, IMG_FORMAT);

	right_2.copyTo(fuse3.colRange(0, right_2.cols));
	left_1.copyTo(fuse4.colRange(fuse4.cols - left_1.cols, fuse4.cols));

	Mat pano_right = fuse3 + fuse4;

	pano_left.copyTo(pano.colRange(0, size.width));
	pano_right.copyTo(pano.colRange(size.width, pano.cols));

	if (gaussf)
	{
		int band = fuse_zone / 2;
		int radius = 5;
		radius = radius < band ? radius : band;

		Mat strip_1 = pano.colRange(pos1 - band - radius, pos1 - band + radius);
		Mat strip_2 = pano.colRange(pos1 + band - radius, pos1 + band + radius);
		Mat strip_3 = pano.colRange(pos2 - band - radius, pos2 - band + radius);
		Mat strip_4 = pano.colRange(pos2 + band - radius, pos2 + band + radius);

		Mat g_strip_1 = Mat::zeros(strip_1.size(), strip_1.type());
		Mat g_strip_2 = Mat::zeros(strip_1.size(), strip_1.type());
		Mat g_strip_3 = Mat::zeros(strip_1.size(), strip_1.type());
		Mat g_strip_4 = Mat::zeros(strip_1.size(), strip_1.type());

		Size g_size(5, 3);
		GaussianBlur(strip_1, g_strip_1, g_size, delta, delta*0.2);
		GaussianBlur(strip_2, g_strip_2, g_size, delta, delta*0.2);
		GaussianBlur(strip_3, g_strip_3, g_size, delta, delta*0.2);
		GaussianBlur(strip_4, g_strip_4, g_size, delta, delta*0.2);

		g_strip_1.copyTo(pano.colRange(pos1 - band - radius, pos1 - band + radius));
		g_strip_2.copyTo(pano.colRange(pos1 + band - radius, pos1 + band + radius));
		g_strip_3.copyTo(pano.colRange(pos2 - band - radius, pos2 - band + radius));
		g_strip_4.copyTo(pano.colRange(pos2 + band - radius, pos2 + band + radius));
	}
	
}


//输入为pano预览图（融合前），接缝位置，接缝区域宽度，接缝图的上下区域，输出为匹配误差和平移量，匹配误差越小越好。
float bandMatcher(InputArray in, int pos, int band, float begin, float end, int& trans, int method, bool debug)
{
	Mat src = in.getMat();

	CV_Assert(!src.empty());

	Mat img = src.colRange(pos - band, pos + band);//裁处带状区域
	Mat src_zone = img.rowRange(src.rows*begin, src.rows*end);//取带状区域中心约三分之一作为匹配区域，因该区域畸变较小
	//转换成灰度图
	Mat zone;
	if (src_zone.channels() > 1)
	{
		cvtColor(src_zone, zone, CV_BGR2GRAY);
	}
	else
	{
		zone = src_zone.clone();
	}

	//左右重叠图像
	Mat left_zone = zone.colRange(0, zone.cols / 2);
	Mat right_zone = zone.colRange(zone.cols / 2, zone.cols);

	float err = 1;//初始化归一化匹配误差为最大

	switch (method)
	{
	case 0:
	{
		for (int t = 1; t <= band; ++t)
		{
			//根据平移量裁剪出重合图像
			Mat left_cover = left_zone.colRange(band - t, band);
			Mat right_cover = right_zone.colRange(0, t);

			//计算重叠区域的差分图像，并计算该差分图像和
			Mat err_img = left_cover - right_cover;
			float area = 255 * left_cover.rows*left_cover.cols;//归一化分母

			Mat sum = Mat::zeros(err_img.rows, 1, CV_8UC1);
			uchar sum_err = 0;

			for (int i = 0; i < err_img.rows; ++i)
			{
				for (int j = 0; j < err_img.cols; ++j)
				{
					sum_err += err_img.at<uchar>(i, j);
				}
			}

			float tmp = (float)sum_err / area;

			if (tmp < err)
			{
				err = tmp;
				trans = t;
			}
		}
	}

		break;

	case 1:
	{
		//采用类LBP算法匹配图像
		//step 1:高斯平滑图像，降低对噪声的稳定性
		//GaussianBlur(left_zone, left_zone, Size(5, 5), 0.5, 0.5);
		//step 2:计算图像均值


	}

		break;

	default:

		break;
	}


	std::cout << "min err = " << err << endl;
	std::cout << "best trans = " << trans << endl;


	if (debug)
	{
		//计算匹配后的图
		Mat fuseImg = Mat::zeros(src_zone.rows, src_zone.cols - trans, src_zone.type());

		src_zone.colRange(0, left_zone.cols - trans).copyTo(fuseImg.colRange(0, left_zone.cols - trans));
		src_zone.colRange(src_zone.cols / 2, src_zone.cols).copyTo(fuseImg.colRange(fuseImg.cols - left_zone.cols, fuseImg.cols));

		imshow("src img", src_zone);
		imshow("match img", fuseImg);

	}


	return err;

}



//大津法自适应二值分割
int otsu(InputArray in)
{
	Mat image = in.getMat();

	CV_Assert(!image.empty());

	if (image.channels()>1)
	{
		std::cout << "warnning: the image is translated to gray-scale image automatically !" << endl;
		Mat tmp;
		cvtColor(image, tmp, CV_BGR2GRAY);
		image = tmp;
	}

	int width = image.cols;
	int height = image.rows;
	int x = 0, y = 0;
	int pixelCount[256] = {0};
	float pixelPro[256] = {0};
	int i, j, pixelSum = width * height, threshold = 0;

	//统计灰度级中每个像素在整幅图像中的个数
	for (i = y; i < height; i++)
	{
		for (j = x; j < width; j++)
		{
			pixelCount[image.at<uchar>(i,j)]++;
		}
	}

	//计算每个像素在整幅图像中的比例
	for (i = 0; i < 256; i++)
	{
		pixelPro[i] = (float)(pixelCount[i]) / (float)(pixelSum);
	}

	//经典ostu算法,得到前景和背景的分割
	//遍历灰度级[0,255],计算出方差最大的灰度值,为最佳阈值
	float w0, w1, u0tmp, u1tmp, u0, u1, u, deltaTmp, deltaMax = 0;
	for (i = 0; i < 256; i++)
	{
		w0 = w1 = u0tmp = u1tmp = u0 = u1 = u = deltaTmp = 0;

		for (j = 0; j < 256; j++)
		{
			if (j <= i) //背景部分
			{
				//以i为阈值分类，第一类总的概率
				w0 += pixelPro[j];
				u0tmp += j * pixelPro[j];
			}
			else       //前景部分
			{
				//以i为阈值分类，第二类总的概率
				w1 += pixelPro[j];
				u1tmp += j * pixelPro[j];
			}
		}

		u0 = u0tmp / w0;		//第一类的平均灰度
		u1 = u1tmp / w1;		//第二类的平均灰度
		u = u0tmp + u1tmp;		//整幅图像的平均灰度
		//计算类间方差
		deltaTmp = w0 * (u0 - u)*(u0 - u) + w1 * (u1 - u)*(u1 - u);
		//找出最大类间方差以及对应的阈值
		if (deltaTmp > deltaMax)
		{
			deltaMax = deltaTmp;
			threshold = i;
		}
	}
	//返回最佳阈值;
	return threshold;
}


//扫描线法寻找圆的切线
Point3f findCenterByScan(InputArray in, int gray_thd, int sensity, bool debug, string name)
{
	Mat image = in.getMat();

	CV_Assert(!image.empty());

	//将彩色图转二值化
	Mat grayImg;
	cvtColor(image, grayImg, CV_BGR2GRAY);
	Mat binaryImg;
	threshold(grayImg, binaryImg, gray_thd, 255, CV_THRESH_BINARY);

	//形态学处理
	Mat morphImg;
	int kernel_size = 50;
	Mat kernel = getStructuringElement(MORPH_RECT, Size(kernel_size * 2 + 1, kernel_size * 2 + 1));
	morphologyEx(binaryImg, morphImg, MORPH_OPEN, kernel);

	Point3f mCircle;

	mCircle.x = morphImg.cols / 2;
	mCircle.y =morphImg.rows / 2;
	float R = min(mCircle.x, mCircle.y)*0.98;

	sensity *= 255;

	//--------------寻找水平方向--------------
	Mat morphImgT = morphImg.t();//基于加速考虑
	int width = morphImgT.cols;
	int height = morphImgT.rows;
	int left = 0, right = morphImgT.rows;
	bool lfinded = false, rfinded = false;

	for (int i = 0; i < height / 2; ++i)
	{
		int sum = 0;

		for (int j = 0; j < width; ++j)
		{
			if (!lfinded)
			{
				sum += morphImgT.at<uchar>(i, j);
			}

		}

		if (sum > sensity && i == 0)
		{
			break;
		}

		if (sum > sensity && i > 0)
		{
			left = i;
			lfinded = true;
			break;
		}
	}

	for (int i = 0; i < height / 2; ++i)
	{
		int sum = 0;

		for (int j = 0; j < width; ++j)
		{
			if (!rfinded)
			{
				sum += morphImgT.at<uchar>(height - i - 1, j);
			}

		}

		if (sum > sensity && i == 0)
		{
			break;
		}

		if (sum > sensity && i > 0)
		{
			right = height - i - 1;
			rfinded = true;
			break;
		}
	}

	//横向不允许两端贴边裁剪
	if (lfinded && rfinded)
	{
		R = (float)(right - left)*0.5f;
		mCircle.x = (float)(right + left)*0.5f;
	}
	else
	{
		std::cout << "camera lens bias error!" << endl;
	}

	//--------------寻找竖直方向--------------
	width = morphImg.cols;
	height = morphImg.rows;
	int up = 0, down = morphImg.rows;
	bool ufinded = false, dfinded = false;

	for (int i = 0; i < height / 2; ++i)
	{
		int sum = 0;

		for (int j = 0; j < width; ++j)
		{
			if (!ufinded)
			{
				sum += morphImg.at<uchar>(i, j);
			}
		}

		if (sum > sensity && i == 0)
		{
			break;
		}

		if (sum > sensity && i > 0)
		{
			up = i;
			ufinded = true;
			break;
		}
	}

	for (int i = 0; i < height / 2; ++i)
	{
		int sum = 0;

		for (int j = 0; j < width; ++j)
		{
			if (!dfinded)
			{
				sum += morphImg.at<uchar>(height - i - 1, j);
			}
		}

		if (sum > sensity && i == 0)
		{
			break;
		}

		if (sum > sensity && i > 0)
		{
			down = height - i - 1;
			dfinded = true;
			break;
		}
	}

	//纵向允许一边贴边裁剪
	if (ufinded && dfinded)
	{
		mCircle.y = (float)(up + down)*0.5f;
	}
	else
	{
		if (ufinded)
		{
			mCircle.y = (float)(up + R);
		}
		else if (dfinded)
		{
			mCircle.y = (float)(down - R);
		}
		else
		{
			mCircle.y = morphImg.rows / 2;
		}
	}

	//debug
	if (debug)
	{
		int dd = 3;
		circle(morphImg, Point(mCircle.x, mCircle.y), 10, Scalar(0), -1);
		line(morphImg, Point(left, 0), Point(left, morphImg.rows), Scalar(255), dd);
		line(morphImg, Point(right, 0), Point(right, morphImg.rows), Scalar(255), dd);
		line(morphImg, Point(0, up), Point(morphImg.cols, up), Scalar(255), dd);
		line(morphImg, Point(0, down), Point(morphImg.cols, down), Scalar(255), dd);

		Mat scale_img;
		resize(morphImg, scale_img, Size(), 0.2, 0.2);
		imshow(name, scale_img);
	}


	mCircle.z = R;

	return mCircle;
}


//下面函数中pos中x为行数，y为列数
inline Vec3b bilinearInterpolate(InputArray in, Point2f pos, Size2i size)
{
	Mat img = in.getMat();

	if (pos.x < 0 || pos.x >= size.height || pos.y < 0 || pos.y >= size.width)
	{
		return Vec3b(0, 0, 0);
	}

	//step 1: 求得当前待差值浮点所在的整点格
	Point2i min, max;

	min.x = (int)pos.x;  max.x = min.x + 1;
	min.x = min.x > 0 ? min.x : 0;
	max.x = max.x < size.height ? max.x : size.height - 1;

	min.y = (int)pos.y;  max.y = min.y + 1;
	min.y = min.y > 0 ? min.y : 0;
	max.y = max.y < size.width ? max.y : size.width - 1;

	//step 2：
	float frac_x, frac_y;
	frac_x = pos.x - min.x;
	frac_y = pos.y - min.y;

	Vec3b tmp1 = img.at<Vec3b>(min.x, min.y)*(1 - frac_y) + img.at<Vec3b>(min.x, max.y)*frac_y;
	Vec3b tmp2 = img.at<Vec3b>(max.x, min.y)*(1 - frac_y) + img.at<Vec3b>(max.x, max.y)*frac_y;

	Vec3b val = tmp1*(1 - frac_x) + tmp2*frac_x;

	return val;
}


Vec3f rotateWithAxis(Vec3f in, Vec3f axis, float angle)
{
	Vec3f axis_ = axis / (norm(axis));//归一化，得到旋转轴单位向量
	float cos_ang = cosf(angle);
	Mat in_(in);
	Mat v(axis_);
	Mat out = in_*cos_ang + (1 - cos_ang)*v.dot(in_)*v + sinf(angle)*(v.cross(in_));

	return Vec3f(out);
}


void sphericalTrans(float lat_in, float lon_in, Vec3f axis, float angle, float &lat_out, float &lon_out)
{
	//step1： 从经纬度球坐标转化为笛卡尔坐标
	float x, y, z, r;
	r = sinf(lat_in);
	x = r*cosf(lon_in);
	y = r*sinf(lon_in);
	z = cosf(lat_in);

	//step2: 将该点转化到新球坐标系对应的笛卡尔坐标系
	Vec3f axis_ = axis / (norm(axis));//归一化，得到旋转轴单位向量
	float cos_ang = cosf(angle);
	Mat in(Vec3f(x, y, z));
	Mat v(axis_);
	Mat out = in*cos_ang + (1 - cos_ang)*v.dot(in)*v + sinf(angle)*(v.cross(in));
	Vec3f pts_new(out);

	//step3: 将新点从笛卡尔坐标系转换到经纬度坐标系
	lat_out = acosf(pts_new[2]);

	lon_out = atan2f(pts_new[1], pts_new[0]);
}


void showImg(const string& name, InputArray img, float scale)
{
	Mat tmp;
	cv::resize(img, tmp, Size(), scale, scale);

	imshow(name, tmp);
}


void imgWarp(InputArray in, OutputArray out, Size size, int searchRange)
{
	Mat img = in.getMat();

	CV_Assert(!img.empty());

	//step 1: find corners
	Mat gray;
	if (img.channels() > 1)
	{
		cvtColor(in, gray, CV_BGR2GRAY);
	}
	else
		gray = img;

	Mat binaryImg;
	threshold(gray, binaryImg, 0, 255, CV_THRESH_BINARY);

	gray.release();

	int width = binaryImg.cols;
	int height = binaryImg.rows;

	std::vector<cv::Point2f> srcPoint(4), dstPoint(4);

	bool find = false;

	//left top
	for (int i = 0; i < searchRange; ++i)
	{	
		//直线方程为：x+y=i
		for (int row = 0; row <= i; ++row)
		{
			int val = binaryImg.at<uchar>(row, i - row);
			if (val>0)
			{
				srcPoint[0] = Point2f(i - row, row);
				find = true;
				break;
			}
		}

		if (find)
		{
			break;
		}
	}


	find = false;
	//right down
	for (int i = 0; i < searchRange; ++i)
	{	
		//直线方程为：x+y=(width-1)+(height-1)-i
		for (int row = (height - 1); row >= (height - 1) - i; --row)
		{
			int val = binaryImg.at<uchar>(row, (width - 1) + (height - 1) - i - row);
			if (val > 0)
			{
				srcPoint[1] = Point2f((width - 1) + (height - 1) - i - row, row);
				find = true;
				break;
			}
		}

		if (find)
		{
			break;
		}
	}

	find = false;
	//left down
	for (int i = 0; i < searchRange; ++i)
	{		
		//直线方程：y=x+(height - 1) - i
		for (int row = (height - 1); row >= (height - 1) - i; --row)
		{
			int val = binaryImg.at<uchar>(row, row - (height - 1) + i);
			if (val > 0)
			{
				srcPoint[2] = Point2f(row - (height - 1) + i, row);
				find = true;
				break;
			}
		}

		if (find)
		{
			break;
		}
	}

	find = false;
	//right top
	for (int i = 0; i < searchRange; ++i)
	{	
		//直线方程：y=x-(width-1) + i
		for (int row = 0; row <= i; ++row)
		{
			int val = binaryImg.at<uchar>(row, row + (width - 1) - i);
			if (val > 0)
			{
				srcPoint[3] = Point2f(row + (width - 1) - i, row);
				find = true;
				break;
			}
		}

		if (find)
		{
			break;
		}
	}

	binaryImg.release();

	srcPoint[0].x += 0.5;
	srcPoint[2].x += 0.5;
	srcPoint[1].x -= 0.5;
	srcPoint[3].x -= 0.5;

	dstPoint[0] = Point2f(0, 0);
	dstPoint[1] = Point2f(size.width - 1, size.height - 1);
	dstPoint[2] = Point2f(0, size.height - 1);
	dstPoint[3] = Point2f(size.width - 1, 0);

	Mat H = getPerspectiveTransform(srcPoint, dstPoint);

// 	Mat res;
	cv::warpPerspective(in, out, H, size, cv::INTER_LINEAR, cv::BORDER_CONSTANT);

	//图像补洞
// 	Mat res_gray, res_mask;
// 	cvtColor(res, res_gray, CV_BGR2GRAY);
// 
// 	threshold(res_gray, res_mask, 0, 255, CV_THRESH_BINARY);
// 
// 
// 	int startRow = 100;
// 
// 	for (int i = 0; i < startRow; ++i)
// 	{
// 		for (int j = 0; j < res.cols; ++j)
// 		{
// 			if (res_mask.at<uchar>(i, j) < 255)
// 			{
// 				res.at<Vec3b>(i, j) = res.at<Vec3b>(startRow, j-1);
// 			}
// 		}
// 	}
// 
// 	res.copyTo(out);
}


// template<class T>
// string num2str(T val)
// {
// 	stringstream ss;
// 	string str;
// 
// 	ss << val;
// 	ss >> str;
// 
// 	return str;
// }
