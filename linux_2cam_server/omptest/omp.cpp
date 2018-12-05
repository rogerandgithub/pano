#include <iostream>   
#include <ctime>   
  
int main(void)   
{   
    int i, stepNum;   
    double sum, x, stepInterval;   
  
    x = 0.0;   
    sum = 0.0;   
    stepNum = 10000000;   
    stepInterval = 1.0/stepNum;   
       
    clock_t t1 = clock();                        // time measure   
    {   
        #pragma omp parallel for private(x),reduction(+:sum)   
        for(i=0; i<stepNum; i++)   
        {   
            x = (i+0.5) * stepInterval;   
            sum += 4.0 / (1+x*x);   
        }   
  
    }   
    clock_t t2 = clock();                       // time measure   
  
    std::cout<<"Pi = " << sum*stepInterval <<"/n";   
    std::cout <<"time = " <<(double)(t2-t1)/CLOCKS_PER_SEC <<"/n";   
    return 0;   
}   
