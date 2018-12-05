cmake_minimum_required (VERSION 2.8 FATAL_ERROR)

project(StiPano2camCloud)


# find openCV
find_package (OpenCV 3.2.0 REQUIRED)
include_directories (${OpenCV_INCLUDE_DIRS})
link_directories    (${OpenCV_LIB_DIR})


# As moc files are generated in the binary dir, tell CMake
# to always look for includes there:
set(CMAKE_INCLUDE_CURRENT_DIR ON)


set  (PROJECT_SOURCES	
	main.cpp
   	stiProcess.cpp
	panoStitch.cpp
	algorithms.cpp
	) 

set  (PROJECT_HEADERS
	stiProcess.h
	panoStitch.h
	algorithms.h
	)
	


ADD_EXECUTABLE  (${PROJECT_NAME} ${PROJECT_SOURCES}
                        ${PROJECT_HEADERS}
					    ${PROJECT_RESOURCES})

TARGET_LINK_LIBRARIES ( ${PROJECT_NAME}  ${OpenCV_LIBS} )