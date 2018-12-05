#include "stiProcess.h"

int main()
{
	string img_path = "/root/suteng/data/imgPath";//"D:/PreReleasePrograms/pano2cam/data/test/vis/1";
	string cam_path = "/root/suteng/data/camPath";// "D:/PreReleasePrograms/pano2cam/data/3";
	string common_path = "/root/suteng/data/commonPath";/// "D:/PreReleasePrograms/pano2cam/param";// "D:/MyPano/data/mask230";

	//测试
	StiProcess panoProcess(img_path, cam_path, common_path);
	panoProcess.setFusionArgs(0.1, 5, false);

//	panoProcess.calcBaseMaps();//app init
// 	panoProcess.calcOne2sixMap(); //app init
	panoProcess.calcSingleMapsAll(); //change camera, wifi ssid 

	int kind = 1;

	UMat pano = panoProcess.exec(kind);
	//showImg("pano", pano, 0.2);

//	vector<Mat> cubeImgs;
//	panoProcess.one2six(pano, cubeImgs);

	if (kind == 0)
	{
		imwrite(img_path + "/panorama_low.jpg", pano);	
	}
	else
	{
		imwrite(img_path + "/panorama_high.jpg", pano);
	}



	waitKey(0);

	return 0;
}
