#ifndef STIPROCESS_H
#define STIPROCESS_H

#include <fstream>
#include <string>
#include <sstream>
#include <opencv2/core/ocl.hpp>
#include "panoStitch.h"
#include "algorithms.h"
 
#define FULL_SIZE 3000
#define CUBE_RADIUS 750
#define PI_OVER_180 (0.0174532925199)
#define IMG_NUM 2


using namespace std;
using namespace cv;


struct ImgCorrectParams
{
	double cx, cy, cr, ang, tx, ty;
};


class StiProcess
{

public:
	
	StiProcess(const string&img_path, const string& cam_path, const string& common_path);
	~StiProcess();	
	
	UMat exec(int kind = 0);
	
	void setFusionArgs(float seam_scale, int blend_layer, bool isexp);

	bool calcBaseMaps();
	void calcOne2sixMap();

	bool calcSingleMapsAll();

	void one2six(InputArray srcImg, vector<Mat>& cube_imgs, bool writeflag = true);

private:

	UMat execLow();
	UMat execHigh();

	bool calcMapSingle(int idx);
	bool readCalibParams();
	bool processSingleHigh(int idx);

	bool processSingleLow(int idx);
	void readMasks();
	
	bool readCommonParams();

	void one2sixMapping(InputArray srcImg, OutputArray dstImg, const string mapName);

	//----------------类成员变量--------------
	string _camPath; //工程文件路径
	string _commonPath; //公共参数配置文件所在目录
	string _imgPath; //存放图像文件

	Mat _correctImg;
	Mat _sHDmapX, _sHDmapY;
	Mat _panoImg;

	Mat _imgMask;

	double _scale;

	//鱼眼展开参数
	vector<ImgCorrectParams> _correct_params;
	int _fuse_band;
	double _map_curve;
	double _map_ratio;
	double _crop_ratio;
	double _half_fov;

	vector<UMat> _imgs;

	float _seamScale;
	int _blendLayer;
	bool _isExposeComp;

};





















#endif
