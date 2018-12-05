#ifndef STIPROCESS_H
#define STIPROCESS_H

#include <fstream>
#include <string>
#include <sstream>
#include <opencv2/core/ocl.hpp>
#include "panoStitch.h"
#include "algorithms.h"
 
#define PIC_SIZE 3000
#define CUBE_RADIUS 750
#define PI_OVER_180 (0.0174532925199f)
#define IMG_NUM 2
#define SHOW_SCALE (1.0f) //app��չʾ�ķֱ��ʺ�ԭʼ�ֱ��ʵı���


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
	
	Mat exec();
	
	void setFusionArgs(float seam_scale, int blend_layer, bool isexp);

	bool calcBaseMaps();
	void calcOne2sixMap();
	bool calcSingleMapsAll();

	void one2six(InputArray srcImg, vector<Mat>& cube_imgs, bool writeflag = true);

private:

	Mat execStitching();

	bool calcMapSingle(int idx);
	bool readCalibParams();
	bool processSingle(int idx);
	
	bool readCommonParams();

	void one2sixMapping(InputArray srcImg, OutputArray dstImg, const string mapName);

	//----------------���Ա����--------------
	string _camPath; //�����ļ�·��
	string _commonPath; //�������������ļ�����Ŀ¼
	string _imgPath; //���ͼ���ļ�

	Mat _correctImg;
	Mat _sHDmapX, _sHDmapY;
	Mat _panoImg;

	Mat _imgMask;

	double _scale;

	//����չ������
	vector<ImgCorrectParams> _correct_params;
	int _fuse_band;
	double _map_curve;
	double _crop_ratio;
	double _half_fov;

	vector<Mat> _imgs;

	float _seamScale;
	int _blendLayer;
	bool _isExposeComp;

};





















#endif
