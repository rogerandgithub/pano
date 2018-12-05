#include <stdio.h>
#include <opencv2/opencv.hpp>
#include <omp.h>

using namespace cv;
using namespace std;

int main(){
    printf("OpenCV: %s", cv::getBuildInformation().c_str());
    #pragma omp parallel
    {
        printf("hello world! ThreadID = %d\n", omp_get_thread_num());
    }
    cout<<endl;
}
