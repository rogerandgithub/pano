#ifndef PANOSTITCH_H
#define PANOSTITCH_H

#include <string>
#include <fstream>
#include <iostream>
#include "opencv2/highgui/highgui.hpp"
#include "opencv2/stitching.hpp"
#include "opencv2/imgproc/imgproc.hpp"

// #define LOGLN(msg) LOG(msg << std::endl)



using namespace std;
using namespace cv;

#define  EXPOSURE  0
#define  PI (3.141592653)
#define  FULL_IMG_AREA (15e6)

class panoStitch
{
public:
	
	enum Status{ OK = 0, ERR };

	void setSeamScale(double seam_scale){ seam_scale_ = seam_scale; }
	void setExposureCompensator(Ptr<detail::ExposureCompensator> exposure_comp){ exposure_comp_ = exposure_comp;}
	void setSeamFinder(Ptr<detail::SeamFinder> seam_finder) { seam_finder_ = seam_finder; }
	void setBlender(Ptr<detail::Blender> b) { blender_ = b; }
	void setWarper(Ptr<WarperCreator> wp){ warper_ = wp; }

	static panoStitch creatDefault(bool try_use_gpu, float seamScale = 0.1, int blendLayer = 6);

	Status stitcher(InputArray src, OutputArray pano, const string& xml_path); //抽离出的只做最后拼接的版本	
	void readCameraParams(const string& xml_path);

	void setExposeureState(bool isexp){ isExposeCompasate_ = isexp; }

private:

	panoStitch(){}


	Status myComposePanoramaOMP(OutputArray pano);
	Status myComposePanorama(OutputArray pano);

	void start_end_blend(OutputArray img, int blendLength);


	//标定参数
	vector<detail::CameraParams> cameras_;

	Ptr<WarperCreator> warper_;
	Ptr<detail::SeamFinder> seam_finder_;
	Ptr<detail::ExposureCompensator> exposure_comp_;
	Ptr<detail::Blender> blender_;
	
	vector<UMat> imgs_; //记录有效匹配过滤后的图像序列
	
	//以下参数先按opencv默认值给定然后从外部读入覆盖		
	double work_scale_; //	
	double warped_image_scale_;//传入
	double seam_scale_;

	int img_num_;

	bool isExposeCompasate_;
};


#endif
