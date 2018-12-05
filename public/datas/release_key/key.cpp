#include <net/if.h>
#include <sys/ioctl.h>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <stdlib.h>
#include <iomanip>
#include <stdio.h>
#include <sys/stat.h>
#include <dirent.h>
#include<sys/types.h>
#include<unistd.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <poll.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/file.h>
#include <signal.h>
#include <memory.h>
#include <boost/shared_ptr.hpp>
using namespace std;
#define ETH_NAME    "eth0"
#define WLAN_NAME   "wlan0"
#define SERIAL_NUM  (24)

#define MODULE_DEBUG 0
static char alphabet[26] = {'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
                            'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
                            'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
                            'y', 'z'};
std::string macKeyGen(unsigned char mac_id[])
{
  unsigned long sum = 0;
  unsigned long arr[6];

  srand(6);

  for(int i = 0; i < 6; ++i)
  {
    arr[i] = (unsigned long) (mac_id[i] << ((6 - i) * rand() % 8)) + rand();
    if(i % 2 == 0)
      sum += arr[i];
    else
      sum *= arr[i];
  }

  std::string str;
  std::stringstream sstr;
  sstr << sum;
  sstr >> str;

  int str_len = str.length();

  srand(sum % str_len + rand());

  if(str_len < SERIAL_NUM)
  {
    int len2 = SERIAL_NUM - str_len;
    for(int i = 0; i < len2; ++i)
    {
      int idx = rand() % 26;//待插入的字母索引；
      int ins_idx = (rand() + arr[rand() % 6]) % str_len;//插入字母位置

      str.insert(ins_idx, 1, alphabet[idx]);
      str_len = str.length();
    }
  }
  else
  {

    int len3 = str_len - SERIAL_NUM;
    for(int i = 0; i < len3; ++i)
    {
      int era_idx = (rand() + arr[rand() % 6]) % str_len;//删除字母位置

      str.erase(era_idx, 1);
      str_len = str.length();
    }
  }

  return str;
}


void customKeyGen(unsigned char seqs[], const std::string &name)
{
  std::string mykey = macKeyGen(seqs);
  
  std::cout << name << "->" << "custom_key: " << mykey << std::endl;

  std::ofstream out("/root/robosense/public/datas/release_key/release.key", std::ios::app | std::ios::out);

  if(!out.is_open())
  {
    std::cout << "key file save failure!" << std::endl;
    return;
  }

  std::stringstream ss;
  for(int i = 0; i < 6; ++i)
  {
    if(i < 5)
      ss << std::setw(2) << std::setfill('0') << std::hex << (int) seqs[i] << "-";
    else
      ss << std::setw(2) << std::setfill('0') << std::hex << (int) seqs[i];
  }

  std::string ori_mac(ss.str());

  out << name << "->" << std::endl;
  out << "original mac: " << ori_mac << std::endl;
  out << "generated key: " << mykey << std::endl;

  std::string bin_path = "/root/robosense/public/datas/keys/" + ori_mac;

  mkdir(bin_path.c_str(), 0777);

  std::ofstream out_bin((bin_path + std::string("/") +std::string("release.bin")).c_str(), std::ios::out);

  out_bin<<mykey<<std::endl;

  out.close();
}


/****************************************************************************
函数名称: str_to_hex
函数功能: 字符串转换为十六进制
输入参数: string 字符串 cbuf 十六进制 len 字符串的长度。
输出参数: 无
*****************************************************************************/
int str_to_hex(const char *string, unsigned char *cbuf, int len)
{
  char high, low;
  int idx, ii=0;
  for (idx=0; idx<len; idx+=2)
  {
    high = string[idx];
    low = string[idx+1];

    if(high>='0' && high<='9')
      high = high-'0';
    else if(high>='A' && high<='F')
      high = high - 'A' + 10;
    else if(high>='a' && high<='f')
      high = high - 'a' + 10;
    else
      return -1;

    if(low>='0' && low<='9')
      low = low-'0';
    else if(low>='A' && low<='F')
      low = low - 'A' + 10;
    else if(low>='a' && low<='f')
      low = low - 'a' + 10;
    else
      return -1;

    cbuf[ii++] = high<<4 | low;
  }
  return 0;
}

/****************************************************************************
函数名称: hex_to_str
函数功能: 十六进制转字符串
输入参数: ptr 字符串 buf 十六进制 len 十六进制字符串的长度。
输出参数: 无
*****************************************************************************/
void hex_to_str(char *ptr,unsigned char *buf,int len)
{
  for(int i = 0; i < len; i++)
  {
    sprintf(ptr, "%02x",buf[i]);
    ptr += 2;
  }
}


void generateKeys(const std::string fname, int kind)
{
  //读入列表
  std::ifstream in(fname.c_str());
  std::string line, mac, name;
  std::stringstream ss;
  char cstr[18];
  char dseq[13];

  while(std::getline(in, line))
  {
    ss<<line;
    ss>>mac>>name;

    unsigned char seqs[6];

    mac.copy(cstr,17,0);
    cstr[17]='\0';

    if (kind == 0)
    {
      sscanf(cstr, "%c%c:%c%c:%c%c:%c%c:%c%c:%c%c", &dseq[0], &dseq[1], &dseq[2], &dseq[3], &dseq[4], &dseq[5],
             &dseq[6], &dseq[7], &dseq[8], &dseq[9], &dseq[10], &dseq[11]);

    }
    else if(kind == 1)
    {
      sscanf(cstr, "%c%c-%c%c-%c%c-%c%c-%c%c-%c%c", &dseq[0], &dseq[1], &dseq[2], &dseq[3], &dseq[4], &dseq[5],
             &dseq[6], &dseq[7], &dseq[8], &dseq[9], &dseq[10], &dseq[11]);
    }

    *(dseq+12) = '\0';

    str_to_hex(dseq, seqs, 12);

    customKeyGen(seqs, name);

    ss.clear();
  }
}




int main(int argc, char **argv)
{
  std::string fname = "/root/robosense/public/datas/keys/input.txt";

  generateKeys(fname, 0);

  return 0;
}



