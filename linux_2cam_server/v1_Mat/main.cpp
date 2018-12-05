#include "stiProcess.h"

int main(int argc, char* argv[])
{
	//image file path
	//string img_path = "/root/suteng/linux_2cam_server/data/imgPath";
	string img_path = argv[1];
	//single map path
	//string cam_path = "/root/suteng/linux_2cam_server/data/camPath";
	string cam_path = argv[2];
	// base map path
	//string common_path = "/root/suteng/linux_2cam_server/data/commonPath";
	string common_path = argv[3];
	string pano_name = argv[4];
	//测试
	//StiProcess panoProcess(img_path, cam_path, common_path);
	StiProcess panoProcess(argv[1], argv[2], argv[3]);
	panoProcess.setFusionArgs(0.2, 5, false);

	//app初始化时计算一次，以后直接读取
 	panoProcess.calcBaseMaps();//app init
// 	panoProcess.calcOne2sixMap(); //app init
 	panoProcess.calcSingleMapsAll(); //change camera, wifi ssid 

	Mat pano = panoProcess.exec();
	//showImg("pano_app", pano, 0.2);

// 	vector<Mat> cubeImgs;
// 	panoProcess.one2six(pano, cubeImgs);

	imwrite(img_path + "/" + pano_name, pano);
	cout<<"stitch ok"<<endl;
	waitKey(0);

	return 0;
}
