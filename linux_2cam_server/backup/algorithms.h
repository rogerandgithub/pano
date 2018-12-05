#ifndef ALGORITHMS_H
#define ALGORITHMS_H

/*
	算法包
*/

#include <opencv2/opencv.hpp>
#include <iostream>

using namespace std;
using namespace cv;

#define PI (3.141592653)
#define PI_2 (1.5707963268)
#define PI_4 (0.78539816)
#define PI2 (6.28318530718)


#define IMG_FORMAT CV_8UC3
#define IMG_INTER_METHOD CV_INTER_LINEAR

enum LineDir
{
	VERTICAL_LEFT = 1,
	VERTICAL_RIGHT,
	HORIZONTAL_UP,
	HORIZONTAL_DOWN
};





//鱼眼图像裁剪
void fisheyeImgCrop(InputArray in, int cx, int cy, int cr, OutputArray out);

//鱼眼图像旋转
void fisheyeImgRotate(InputArray in, float angle, OutputArray out);

//普通直接生成的图像尺寸相关的_map
void calcCorrectMap(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov, double lat_angle, double lon_angle);
void calcCorrectMapTop(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov);

//生成标准归一化非中心的公共_map
void calcStandardMap(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov, double lat_angle, double lon_angle);
void calcStandardMapTop(Size2i size, OutputArray mapX, OutputArray mapY, double mapCurve, double fovRatio, double half_fov);

void calcIndividualMap(InputArray mapXIn, InputArray mapYIn, OutputArray mapXOut, OutputArray mapYOut, double angle, double centerX, double centerY, double R); //根据标准_map生成针对图像个性化的校正_map


void imgFuser(InputArray in, OutputArray out, Size2i size, int pos1, int pos2, float delta, bool gaussf = true);

void generateGaussKernel(float delta, int R, float*gaussKernel);

//判断半径重叠最优平移
float bandMatcher(InputArray in, int pos, int band, float begin, float end, int& trans, int method=0, bool debug=false);

//大津法图像自适应阈值二值化
int otsu(InputArray in);

//扫描线法寻找圆心初始位置
Point3f findCenterByScan(InputArray in, int gray_thd, int sensity, bool debug, string name = "result");


Vec3f rotateWithAxis(Vec3f in, Vec3f axis, float angle);
void sphericalTrans(float lat_in, float lon_in, Vec3f axis, float angle, float &lat_out, float &lon_out);


Vec3b bilinearInterpolate(InputArray in, Point2f pos, Size2i size);


void imgHorizontalMove(InputArray in, OutputArray out, int mov);
void imgHorizontalMove(Mat& img, int mov);

void imgVerticalMove(InputArray in, OutputArray out, int mov);
void imgVerticalMove(Mat& img, int mov);

void imgMove(InputArray in, OutputArray out, int movx, int movy);
void imgMove(Mat& img, int movx, int movy);

void imgMaskFilter(InputArray in, InputArray mask, OutputArray out);
void imgMaskFilter(Mat& img, InputArray mask);

void imgSlopeEdgeHorizon(InputArray in, int startLine, int edgeWidth, int dir, OutputArray out);

void imgSlopeEdgeVertical(InputArray in, int startLine, int edgeWidth, int dir, OutputArray out);

void imgSlopeEdge(InputArray in, int startLine, int fuseRadius, LineDir dir, OutputArray out);

void showImg(const string& name, InputArray img, float scale = 1.0);

void imgWarp(InputArray in, OutputArray out, Size size, int searchRange=200);


// template<class T>
// string num2str(T val);

template<class T>
string num2str(T val)
{
	stringstream ss;
	string str;

	ss << val;
	ss >> str;

	return str;
}

#endif // !ALGORITHMS_H
