#include "algorithms.h"


//���ɱ�׼��һ�������ĵĹ���_map
void calcStandardMap(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double half_fov, double lat_angle, double lon_angle)
{
	int width = size.width, height = size.height;

	Mat mapX_out = mapX.getMatRef();
	Mat mapY_out = mapY.getMatRef();

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //ά��
	{
		float latitude = (float)(i) / height*PI;
		for (int j = 0; j < width; ++j) //����
		{
			float longitude = (float)(width - j) / width*PI2 - PI_2 + lon_angle;
			float lat_out, lon_out;

			sphericalTrans(latitude, longitude, Vec3f(1, 0, 0), lat_angle, lat_out, lon_out);

			float r = (1.0 - powf(1.0 - lat_out / half_fov, mapCurve));

			float x = r*cosf(lon_out);
			float y = r*sinf(lon_out);

			mapX_out.at<float>(i, j) = x;
			mapY_out.at<float>(i, j) = y;
		}
	}
}


void calcStandardMapTop(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double half_fov)
{
	int width = size.width, height = size.height;

	Mat mapX_out = mapX.getMatRef();
	Mat mapY_out = mapY.getMatRef();

#pragma omp parallel for schedule(dynamic)
	for (int i = 0; i < height; ++i) //ά��
	{
		float latitude = (float)(i) / height*PI;
		for (int j = 0; j < width; ++j) //����
		{
			float longitude = (float)(width - j) / width*PI2 - PI_2;

			float r = (1.0 - powf(1.0 - latitude / half_fov, mapCurve));

			float x = r*cosf(longitude);
			float y = r*sinf(longitude);

			mapX_out.at<float>(i, j) = x;
			mapY_out.at<float>(i, j) = y;
		}
	}
}


//���ݱ�׼_map�������ͼ����Ի���У��_map
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
	for (int i = 0; i < height; ++i) //ά��
	{
		for (int j = 0; j < width; ++j) //����
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

	if (dir >= 0) //��������б�±�Ե
	{
		int start = startLine;
		int end = start + edgeWidth < img.cols ? start + edgeWidth : img.cols;

		for (int i = start+1; i <= end; ++i)
		{
			float decay = (float)(i - start) / edgeWidth;
			img_out.col(i) = img.col(i)*(1 - decay);
		}
	}
	else  //��������б�±�Ե
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

	if (dir >= 0) //��������б�±�Ե
	{
		int start = startLine;
		int end = start + edgeWidth < img.rows ? start + edgeWidth : img.rows;

		for (int i = start + 1; i <= end; ++i)
		{
			float decay = (float)(i - start) / edgeWidth;
			img_out.row(i) = img.row(i)*(1 - decay);
		}
	}
	else  //��������б�±�Ե
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


//����ΪpanoԤ��ͼ���ں�ǰ�����ӷ�λ�ã��ӷ������ȣ��ӷ�ͼ�������������Ϊƥ������ƽ������ƥ�����ԽСԽ�á�
float bandMatcher(InputArray in, int pos, int band, float begin, float end, int& trans, int method, bool debug)
{
	Mat src = in.getMat();

	CV_Assert(!src.empty());

	Mat img = src.colRange(pos - band, pos + band);//�ô���״����
	Mat src_zone = img.rowRange(src.rows*begin, src.rows*end);//ȡ��״��������Լ����֮һ��Ϊƥ�����������������С
	//ת���ɻҶ�ͼ
	Mat zone;
	if (src_zone.channels() > 1)
	{
		cvtColor(src_zone, zone, CV_BGR2GRAY);
	}
	else
	{
		zone = src_zone.clone();
	}

	//�����ص�ͼ��
	Mat left_zone = zone.colRange(0, zone.cols / 2);
	Mat right_zone = zone.colRange(zone.cols / 2, zone.cols);

	float err = 1;//��ʼ����һ��ƥ�����Ϊ���

	switch (method)
	{
	case 0:
	{
		for (int t = 1; t <= band; ++t)
		{
			//����ƽ�����ü����غ�ͼ��
			Mat left_cover = left_zone.colRange(band - t, band);
			Mat right_cover = right_zone.colRange(0, t);

			//�����ص�����Ĳ��ͼ�񣬲�����ò��ͼ���
			Mat err_img = left_cover - right_cover;
			float area = 255 * left_cover.rows*left_cover.cols;//��һ����ĸ

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
		//������LBP�㷨ƥ��ͼ��
		//step 1:��˹ƽ��ͼ�񣬽��Ͷ��������ȶ���
		//GaussianBlur(left_zone, left_zone, Size(5, 5), 0.5, 0.5);
		//step 2:����ͼ���ֵ


	}

		break;

	default:

		break;
	}


	std::cout << "min err = " << err << endl;
	std::cout << "best trans = " << trans << endl;


	if (debug)
	{
		//����ƥ����ͼ
		Mat fuseImg = Mat::zeros(src_zone.rows, src_zone.cols - trans, src_zone.type());

		src_zone.colRange(0, left_zone.cols - trans).copyTo(fuseImg.colRange(0, left_zone.cols - trans));
		src_zone.colRange(src_zone.cols / 2, src_zone.cols).copyTo(fuseImg.colRange(fuseImg.cols - left_zone.cols, fuseImg.cols));

		imshow("src img", src_zone);
		imshow("match img", fuseImg);

	}


	return err;

}



//�������Ӧ��ֵ�ָ�
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

	//ͳ�ƻҶȼ���ÿ������������ͼ���еĸ���
	for (i = y; i < height; i++)
	{
		for (j = x; j < width; j++)
		{
			pixelCount[image.at<uchar>(i,j)]++;
		}
	}

	//����ÿ������������ͼ���еı���
	for (i = 0; i < 256; i++)
	{
		pixelPro[i] = (float)(pixelCount[i]) / (float)(pixelSum);
	}

	//����ostu�㷨,�õ�ǰ���ͱ����ķָ�
	//�����Ҷȼ�[0,255],������������ĻҶ�ֵ,Ϊ�����ֵ
	float w0, w1, u0tmp, u1tmp, u0, u1, u, deltaTmp, deltaMax = 0;
	for (i = 0; i < 256; i++)
	{
		w0 = w1 = u0tmp = u1tmp = u0 = u1 = u = deltaTmp = 0;

		for (j = 0; j < 256; j++)
		{
			if (j <= i) //��������
			{
				//��iΪ��ֵ���࣬��һ���ܵĸ���
				w0 += pixelPro[j];
				u0tmp += j * pixelPro[j];
			}
			else       //ǰ������
			{
				//��iΪ��ֵ���࣬�ڶ����ܵĸ���
				w1 += pixelPro[j];
				u1tmp += j * pixelPro[j];
			}
		}

		u0 = u0tmp / w0;		//��һ���ƽ���Ҷ�
		u1 = u1tmp / w1;		//�ڶ����ƽ���Ҷ�
		u = u0tmp + u1tmp;		//����ͼ���ƽ���Ҷ�
		//������䷽��
		deltaTmp = w0 * (u0 - u)*(u0 - u) + w1 * (u1 - u)*(u1 - u);
		//�ҳ������䷽���Լ���Ӧ����ֵ
		if (deltaTmp > deltaMax)
		{
			deltaMax = deltaTmp;
			threshold = i;
		}
	}
	//���������ֵ;
	return threshold;
}


//ɨ���߷�Ѱ��Բ������
Point3f findCenterByScan(InputArray in, int gray_thd, int sensity, bool debug, string name)
{
	Mat image = in.getMat();

	CV_Assert(!image.empty());

	//����ɫͼת��ֵ��
	Mat grayImg;
	cvtColor(image, grayImg, CV_BGR2GRAY);
	Mat binaryImg;
	threshold(grayImg, binaryImg, gray_thd, 255, CV_THRESH_BINARY);

	//��̬ѧ����
	Mat morphImg;
	int kernel_size = 50;
	Mat kernel = getStructuringElement(MORPH_RECT, Size(kernel_size * 2 + 1, kernel_size * 2 + 1));
	morphologyEx(binaryImg, morphImg, MORPH_OPEN, kernel);

	Point3f mCircle;

	mCircle.x = morphImg.cols / 2;
	mCircle.y =morphImg.rows / 2;
	float R = min(mCircle.x, mCircle.y)*0.98;

	sensity *= 255;

	//--------------Ѱ��ˮƽ����--------------
	Mat morphImgT = morphImg.t();//���ڼ��ٿ���
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

	//���������������߲ü�
	if (lfinded && rfinded)
	{
		R = (float)(right - left)*0.5f;
		mCircle.x = (float)(right + left)*0.5f;
	}
	else
	{
		std::cout << "camera lens bias error!" << endl;
	}

	//--------------Ѱ����ֱ����--------------
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

	//��������һ�����߲ü�
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


//���溯����pos��xΪ������yΪ����
inline Vec3b bilinearInterpolate(InputArray in, Point2f pos, Size2i size)
{
	Mat img = in.getMat();

	if (pos.x < 0 || pos.x >= size.height || pos.y < 0 || pos.y >= size.width)
	{
		return Vec3b(0, 0, 0);
	}

	//step 1: ��õ�ǰ����ֵ�������ڵ������
	Point2i min, max;

	min.x = (int)pos.x;  max.x = min.x + 1;
	min.x = min.x > 0 ? min.x : 0;
	max.x = max.x < size.height ? max.x : size.height - 1;

	min.y = (int)pos.y;  max.y = min.y + 1;
	min.y = min.y > 0 ? min.y : 0;
	max.y = max.y < size.width ? max.y : size.width - 1;

	//step 2��
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
	Vec3f axis_ = axis / (norm(axis));//��һ�����õ���ת�ᵥλ����
	float cos_ang = cosf(angle);
	Mat in_(in);
	Mat v(axis_);
	Mat out = in_*cos_ang + (1 - cos_ang)*v.dot(in_)*v + sinf(angle)*(v.cross(in_));

	return Vec3f(out);
}


Vec3d rotateWithAxis_d(Vec3d in, Vec3d axis, double angle)
{
	Vec3d axis_ = axis / (norm(axis));//��һ�����õ���ת�ᵥλ����
	double cos_ang = cos(angle);
	Mat in_(in);
	Mat v(axis_);
	Mat out = in_*cos_ang + (1 - cos_ang)*v.dot(in_)*v + sin(angle)*(v.cross(in_));

	return Vec3d(out);
}


void sphericalTrans(float lat_in, float lon_in, Vec3f axis, float angle, float &lat_out, float &lon_out)
{
	//step1�� �Ӿ�γ��������ת��Ϊ�ѿ�������
	float x, y, z, r;
	r = sinf(lat_in);
	x = r*cosf(lon_in);
	y = r*sinf(lon_in);
	z = cosf(lat_in);

	//step2: ���õ�ת������������ϵ��Ӧ�ĵѿ�������ϵ
	Vec3f axis_ = axis / (norm(axis));//��һ�����õ���ת�ᵥλ����
	float cos_ang = cosf(angle);
	Mat in(Vec3f(x, y, z));
	Mat v(axis_);
	Mat out = in*cos_ang + (1 - cos_ang)*v.dot(in)*v + sinf(angle)*(v.cross(in));
	Vec3f pts_new(out);

	//step3: ���µ�ӵѿ�������ϵת������γ������ϵ
	lat_out = acosf(pts_new[2]);

	lon_out = atan2f(pts_new[1], pts_new[0]);
}


void sphericalTrans_d(double lat_in, double lon_in, Vec3d axis, double angle, double &lat_out, double &lon_out)
{
	//step1�� �Ӿ�γ��������ת��Ϊ�ѿ�������
	double x, y, z, r;
	r = sin(lat_in);
	x = r*cos(lon_in);
	y = r*sin(lon_in);
	z = cos(lat_in);

	//step2: ���õ�ת������������ϵ��Ӧ�ĵѿ�������ϵ
	Vec3d axis_ = axis / (norm(axis));//��һ�����õ���ת�ᵥλ����
	double cos_ang = cos(angle);
	Mat in(Vec3d(x, y, z));
	Mat v(axis_);
	Mat out = in*cos_ang + (1 - cos_ang)*v.dot(in)*v + sin(angle)*(v.cross(in));
	Vec3d pts_new(out);

	//step3: ���µ�ӵѿ�������ϵת������γ������ϵ
	lat_out = acos(pts_new[2]);

	lon_out = atan2(pts_new[1], pts_new[0]);
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
		//ֱ�߷���Ϊ��x+y=i
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
		//ֱ�߷���Ϊ��x+y=(width-1)+(height-1)-i
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
		//ֱ�߷��̣�y=x+(height - 1) - i
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
		//ֱ�߷��̣�y=x-(width-1) + i
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

	//ͼ�񲹶�
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