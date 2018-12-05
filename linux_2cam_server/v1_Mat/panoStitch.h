#ifndef PANOSTITCH_H
#define PANOSTITCH_H

#include <string>
#include <fstream>
#include <iostream>
#include "opencv2/highgui/highgui.hpp"
#include "opencv2/stitching.hpp"
#include "opencv2/imgproc/imgproc.hpp"


using namespace std;
using namespace cv;

#define  EXPOSURE  0
#define  PI (3.141592653)

#define LOGLN(msg) (cout<<msg<<endl)

#define ENABLE_LOG 0

#define ENABLE_OMP 0

class panoStitch
{
public:
	
	enum Status {OK = 0, ERR, ERR_INVALID_CAMERA_PARAM};

	void setSeamScale(double seam_scale){ seam_scale_ = seam_scale; }
	void setExposureCompensator(Ptr<detail::ExposureCompensator> exposure_comp){ exposure_comp_ = exposure_comp;}
	void setSeamFinder(Ptr<detail::SeamFinder> seam_finder) { seam_finder_ = seam_finder; }
	void setBlender(Ptr<detail::Blender> b) { blender_ = b; }
	void setWarper(Ptr<WarperCreator> wp){ warper_ = wp; }

	static panoStitch creatDefault(bool try_use_gpu, float seamScale = 0.1, int blendLayer = 6);

	Status stitcher(InputArray src, OutputArray pano, const string& xml_path); //�������ֻ�����ƴ�ӵİ汾	
	void readCameraParams(const string& xml_path);

	void setExposeureState(bool isexp){ isExposeCompasate_ = isexp; }

private:

	panoStitch(){}

	Status myComposePanorama(OutputArray pano);


	//�궨����
	vector<detail::CameraParams> cameras_;

	Ptr<WarperCreator> warper_;
	Ptr<detail::SeamFinder> seam_finder_;
	Ptr<detail::ExposureCompensator> exposure_comp_;
	Ptr<detail::Blender> blender_;
	
	vector<Mat> imgs_; //��¼��Чƥ����˺��ͼ������
	
	//���²����Ȱ�opencvĬ��ֵ����Ȼ����ⲿ���븲��		
	double work_scale_; //	
	double warped_image_scale_;//����
	double seam_scale_;

	int img_num_;

	bool isExposeCompasate_;
};


#endif