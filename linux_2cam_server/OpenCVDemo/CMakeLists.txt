cmake_minimum_required(VERSION 2.8)

project(Demo)

# omp
find_package (OpenMP REQUIRED)
if(OPENMP_FOUND)
message("OPENMP FOUND")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${OpenMP_C_FLAGS}")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}")
set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${OpenMP_EXE_LINKER_FLAGS}")
endif()

find_package(OpenCV 3.2.0 REQUIRED)
include_directories (${OpenCV_INCLUDE_DIRS})
link_directories    (${OpenCV_LIB_DIR})

set  (PROJECT_SOURCES	
	opencvdemo.cpp
	) 

ADD_EXECUTABLE  (${PROJECT_NAME} ${PROJECT_SOURCES})
TARGET_LINK_LIBRARIES ( ${PROJECT_NAME}  ${OpenCV_LIBS} )