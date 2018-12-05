(function($,undefined){
	
	$.fn.upload = function(options,param){
		var otherArgs = Array.prototype.slice.call(arguments, 1);
		if (typeof options == 'string') {
			var fn = this[0][options];
			if($.isFunction(fn)){
				return fn.apply(this, otherArgs);
			}else{
				throw ("zyUpload - No such method: " + options);
			}
		}
		return this.each(function(){
			var para = {};    // 保留参数
			var self = this;  // 保存组件对象
			var defaults = {
					dragDrop         : true,  						// 是否可以拖动上传文件
					del              : true,  						// 是否可以删除文件
					finishDel        : false,  						// 是否在上传文件完成后删除预览
					/* 提供给外部的接口方法 */
					onSelect         : function(selectFiles, files){},// 选择文件的回调方法  selectFile:当前选中的文件  
					onDelete		 : function(file, files){},     // 删除一个文件的回调方法 file:当前删除的文件  files:删除之后的文件
					onSuccess		 : function(file){},            // 文件上传成功的回调方法
					onFailure		 : function(file){},            // 文件上传失败的回调方法
					onComplete		 : function(responseInfo){},    // 上传完成的回调方法
			};
			para = $.extend(defaults,options);
			this.funSetStatusInfo = function(files){
				var size = 0;
				var num = files.length;
				$.each(files, function(k,v){
					size += v.size;
				});
				if (size > 1024 * 1024) {                    
					size = (Math.round(size * 100 / (1024 * 1024)) / 100).toString() + 'MB';                
				} else {                    
					size = (Math.round(size * 100 / 1024) / 100).toString() + 'KB';                
				}  
				$("#status_info").html("选中"+num+"张文件，共"+size+"。");
			};
			this.funDisposePreviewHtml = function(file, e){
				var html = "";
				var imgWidth = parseInt(para.itemWidth.replace("px", ""))-15;
				// 处理配置参数删除按钮
				var delHtml = "";
				if(para.del){  // 显示删除按钮
					delHtml = '<span class="file_del" data-index="'+file.index+'" title="删除"></span>';
				}
				// 处理不同类型文件代表的图标
				var fileImgSrc = "control/images/fileType/";
				if(file.type.indexOf("rar") > 0){
					fileImgSrc = fileImgSrc + "rar.png";
				}else if(file.type.indexOf("zip") > 0){
					fileImgSrc = fileImgSrc + "zip.png";
				}else if(file.type.indexOf("text") > 0){
					fileImgSrc = fileImgSrc + "txt.png";
				}else{
					fileImgSrc = fileImgSrc + "file.png";
				}
				// 图片上传的是图片还是其他类型文件
				if (file.type.indexOf("image") == 0){
					var self = e.target;
					html += '<div id="uploadList_'+ file.index +'" class="upload_append_list">';
					html += '	<div class="file_bar">';
					html += '		<div>';
					// html += '			<p class="file_name">' + file.name + '</p>';
					html += delHtml; 
					html += '		</div>';
					html += '	</div>';
					html += '	<a href="javascript:;" class="imgBox">';
					html += '		<div class="uploadImg" style="width:250px">';				
					html += '			<canvas id="myCanvas' + file.index + '" width="250" height="125"></canvas>';
					html += '		</div>';
					html += '       <input id="name_' + file.index + '" value="' + file.name.split('.')[0] + '" placeholder="请输入名称" style="width:50%" class="name_input"/>';
					html += '	</a>';
					html += '	<p id="uploadProgress_' + file.index + '" class="file_progress"></p>';
					html += '	<p id="uploadFailure_' + file.index + '" class="file_failure">上传失败，请重试</p>';
					html += '	<p id="uploadSuccess_' + file.index + '" class="file_success"></p>';
					html += '</div>';
				}
				return html;
			};
			this.render = function (src, i, html, func){
				var self = this;
                var image = new Image();
                image.crossOrigin = "*";
                image.onload = function(){
                	if((image.height/image.width)!=6&&(image.width/image.height)!=2){
	            		toast.showmsg('长宽比不符合规格', true);
            			return;
                	}
                	func(html);
            		var canvas = document.getElementById("myCanvas"+i);
                	var ctx = canvas.getContext("2d");
                	if(image.height/image.width==6){
            			type = 6;
	                    var len = image.height/image.width;
	                    image.width = 200;
	                    image.height = 200*len;
	                    canvas.height = image.height/3;
	                    canvas.width = image.width;
	                    ctx.drawImage(image, 0, 0, image.width, image.height);
                	}else{
                		type = 2;
	                    image.width = 250;
	                    image.height = 125;
	                    ctx.drawImage(image, 0, 0, image.width, image.height);
                	}
                };
				image.src = src;
            };
            this.pindex = 0;
			this.funFilterEligibleFile = function(files){
				var arrFiles = [];
				for (var i = 0, file; file = files[i]; i++) {
					if (file.size >= 51200000) {
						toast.showmsg('您这个"'+ file.name +'"文件大小过大', true);	
					} else {
						arrFiles.push(file);	
					}
				}
				return arrFiles;
			};
			this.createCorePlug = function(){
				var params = {
					fileInput: $("#fileImage").get(0),
					uploadInput: $("#fileSubmit").get(0),
					dragDrop: $("#fileDragArea").get(0),
					filterFile: function(files) {
						return self.funFilterEligibleFile(files);
					},
					onSelect: function(selectFiles, allFiles) {
						para.onSelect(selectFiles, allFiles);  // 回调方法
						self.funSetStatusInfo(ZYFILE.funReturnNeedFiles());  // 显示统计信息
						var html = '', i = 0;
						// 组织预览html
						var funDealtPreviewHtml = function() {
							file = selectFiles[i];
							if (file) {
								var reader = new FileReader();
								reader.onload = function(e) {
									// 处理下配置参数和格式的html

									html += self.funDisposePreviewHtml(file, e);
									i++;
									// 再接着调用此方法递归组成可以预览的html
									
									funDealtPreviewHtml();
				                	

									self.render(e.target.result, i-1+self.pindex, html, function(html){
										funAppendPreviewHtml(html);
									});
									
									html ='';
									if(!file){
										self.pindex = allFiles.length;
									}
								}
								reader.readAsDataURL(file);
							}
						};
						// 添加预览html
						var funAppendPreviewHtml = function(html){
							// 添加到添加按钮前
							if(para.dragDrop){
								$("#preview").append(html);
							}else{
								$(".add_upload").before(html);
							}
                            $('.preview-container').show();
							// 绑定删除按钮
							funBindDelEvent();
							funBindHoverEvent();
						};
						// 绑定删除按钮事件
						var funBindDelEvent = function(){
							if($(".file_del").length>0){
								// 删除方法
								$(".file_del").click(function() {
									ZYFILE.funDeleteFile(parseInt($(this).attr("data-index")), true);
									return false;	
								});
							}
						};
						// 绑定显示操作栏事件
						var funBindHoverEvent = function(){
							$(".upload_append_list").hover(
								function (e) {
									$(this).find(".file_bar").addClass("file_hover");
								},function (e) {
									$(this).find(".file_bar").removeClass("file_hover");
								}
							);
						};
						funDealtPreviewHtml();		
					},
					onDelete: function(file, files) {
						// 移除效果
						$("#uploadList_" + file.index).fadeOut();
						// 重新设置统计栏信息
						self.funSetStatusInfo(files);
                        if(files.length==0)$('.preview-container').hide();
					},
					onSuccess: function(file, response) {
						$("#uploadProgress_" + file.index).hide();
						$("#uploadSuccess_" + file.index).show();
						$("#uploadInf").append("<p>上传成功，文件地址是：" + response + "</p>");
						// 根据配置参数确定隐不隐藏上传成功的文件
						if(para.finishDel){
							// 移除效果
							$("#uploadList_" + file.index).fadeOut();
							// 重新设置统计栏信息
							self.funSetStatusInfo(ZYFILE.funReturnNeedFiles());
						}
					},
					onFailure: function(file) {
						$("#uploadProgress_" + file.index).hide();
						$("#uploadSuccess_" + file.index).show();
						$("#uploadInf").append("<p>文件" + file.name + "上传失败！</p>");	
						//$("#uploadImage_" + file.index).css("opacity", 0.2);
					},
					onComplete: function(response){
						console.info(response);
					},
					onDragOver: function() {
						$(this).addClass("upload_drag_hover");
					},
					onDragLeave: function() {
						$(this).removeClass("upload_drag_hover");
					}
				};
				
				ZYFILE = $.extend(ZYFILE, params);
				ZYFILE.init();
			};
			this.addEvent = function(){
				var self = this;
				// 如果快捷添加文件按钮存在
				if($(".filePicker").length > 0){
					// 绑定选择事件
					$(".filePicker").bind("click", function(e){
		            	$("#fileImage").click();
		            });
				}
				// 绑定上传点击事件
				$(".upload_btn").bind("click", function(e){
					console.log(ZYFILE.funReturnNeedFiles().length);
					// 判断当前是否有文件需要上传
					if(ZYFILE.funReturnNeedFiles().length > 0){
						$("#fileSubmit").click();
					}else{
						toast.showmsg("请添加文件", true);
					}
	            });
			};
			// 初始化上传控制层插件
            this.addEvent();
			this.createCorePlug();  // 调用核心js
		});
	};
})(jQuery);

//上传接口文件

var ZYFILE = {
		fileInput : null,             // 选择文件按钮dom对象
		uploadInput : null,           // 上传文件按钮dom对象
		dragDrop: null,				  //拖拽敏感区域
		uploadFile : [],  			  // 需要上传的文件数组
		lastUploadFile : [],          // 上一次选择的文件数组，方便继续上传使用
		perUploadFile : [],           // 存放永久的文件数组，方便删除使用
		fileNum : 0,                  // 代表文件总个数，因为涉及到继续添加，所以下一次添加需要在它的基础上添加索引
		/* 提供给外部的接口 */
		filterFile : function(files){ // 提供给外部的过滤文件格式等的接口，外部需要把过滤后的文件返回
			return files;
		},
		onSelect : function(selectFile, files){      // 提供给外部获取选中的文件，供外部实现预览等功能  selectFile:当前选中的文件  allFiles:还没上传的全部文件
		},
		onDelete : function(file, files){            // 提供给外部获取删除的单个文件，供外部实现删除效果  file:当前删除的文件  files:删除之后的文件
		},
		onProgress : function(file, num){  // 提供给外部获取单个文件的上传进度，供外部实现上传进度效果
			console.log(num);
			var eleProgress = $("#uploadProgress_" + file.index), percent = num + '%';
			if(eleProgress.is(":hidden")){
				eleProgress.show();
			}
			eleProgress.css("width",percent);		
		},
		onSuccess : function(file, responseInfo){    // 提供给外部获取单个文件上传成功，供外部实现成功效果
			
		},
		onFailure : function(file, responseInfo){    // 提供给外部获取单个文件上传失败，供外部实现失败效果
		
		},
		onComplete : function(responseInfo){         // 提供给外部获取全部文件上传完成，供外部实现完成效果
			
		},
		
		/* 内部实现功能方法 */
		// 获得选中的文件
		//文件拖放
		funDragHover: function(e) {
			e.stopPropagation();
			e.preventDefault();
			this[e.type === "dragover"? "onDragOver": "onDragLeave"].call(e.target);
			return this;
		},
		// 获取文件
		funGetFiles : function(e){  
			var self = this;
			// 取消鼠标经过样式
			this.funDragHover(e);
			// 从事件中获取选中的所有文件
			var files = e.target.files || e.dataTransfer.files;
			self.lastUploadFile = this.uploadFile;
			this.uploadFile = this.uploadFile.concat(this.filterFile(files));
			var tmpFiles = [];
			
			// 因为jquery的inArray方法无法对object数组进行判断是否存在于，所以只能提取名称进行判断
			var lArr = [];  // 之前文件的名称数组
			var uArr = [];  // 现在文件的名称数组
			$.each(self.lastUploadFile, function(k, v){
				lArr.push(v.name);
			});
			$.each(self.uploadFile, function(k, v){
				uArr.push(v.name);
			});
			
			$.each(uArr, function(k, v){
				// 获得当前选择的每一个文件   判断当前这一个文件是否存在于之前的文件当中
				if($.inArray(v, lArr) < 0){  // 不存在
					tmpFiles.push(self.uploadFile[k]);
				}
			});
			
			// 如果tmpFiles进行过过滤上一次选择的文件的操作，需要把过滤后的文件赋值
			//if(tmpFiles.length!=0){
				this.uploadFile = tmpFiles;
			//}
			
			// 调用对文件处理的方法
			this.funDealtFiles();
			
			return true;
		},
		// 处理过滤后的文件，给每个文件设置下标
		funDealtFiles : function(){
			var self = this;
			// 目前是遍历所有的文件，给每个文件增加唯一索引值
			$.each(this.uploadFile, function(k, v){
				// 因为涉及到继续添加，所以下一次添加需要在总个数的基础上添加
				v.index = self.fileNum;
				// 添加一个之后自增
				self.fileNum++;
			});
			// 先把当前选中的文件保存备份
			var selectFile = this.uploadFile;  
			// 要把全部的文件都保存下来，因为删除所使用的下标是全局的变量
			this.perUploadFile = this.perUploadFile.concat(this.uploadFile);
			// 合并下上传的文件
			this.uploadFile = this.lastUploadFile.concat(this.uploadFile);
			
			// 执行选择回调
			this.onSelect(selectFile, this.uploadFile);
			return this;
		},
		// 处理需要删除的文件  isCb代表是否回调onDelete方法  
		// 因为上传完成并不希望在页面上删除div，但是单独点击删除的时候需要删除div   所以用isCb做判断
		funDeleteFile : function(delFileIndex, isCb){
			var self = this;  // 在each中this指向没个v  所以先将this保留
			
			var tmpFile = [];  // 用来替换的文件数组
			// 合并下上传的文件
			var delFile = this.perUploadFile[delFileIndex];
			console.info(delFile);
			// 目前是遍历所有的文件，对比每个文件  删除
			$.each(this.uploadFile, function(k, v){
				if(delFile != v){
					// 如果不是删除的那个文件 就放到临时数组中
					tmpFile.push(v);
				}else{
					
				}
			});
			this.uploadFile = tmpFile;
			if(isCb){  // 执行回调
				// 回调删除方法，供外部进行删除效果的实现
				self.onDelete(delFile, this.uploadFile);
			}
			
			console.info("还剩这些文件没有上传:");
			console.info(this.uploadFile);
			return true;
		},
		// 上传多个文件
		funUploadFiles : function(){
			var self = this; 
			self.funUploadFile(this.uploadFile);
		},
		hadUpload: 0,
		groupid: 0,
		funchecknames: function(){
			var flag = true;
			for (var i = this.uploadFile.length - 1; i >= 0; i--) {
				if(!$('#name_'+this.uploadFile[i].index).val())
					flag = false;
			};
			return flag;
		},
		funUploadFile : function(files){
			var self = this;
			if(!groupid){
				if(!self.funchecknames()||!$('#city').html()||!$('#bussiness').val()||!$('#community').val()||!$('#building').val()||!$('#room').val()){
					toast.showmsg('请完成资料填写');
					return;
				}
			}
			var file = files[self.hadUpload];
			if(!groupid){
				var data = {
					city: $('#city').html().split('-')[1],
					region: $('#city').html().split('-')[2],
					business_circle: $('#bussiness').val(),
					community: $('#community').val(),
					room: $('#room').val(),
					building: $('#building').val(),
					name: $('#name_'+file.index).val()
				};
				if( type ==6 ){
					data.scenestyle = 6;
				}
			}else{
				var data = {
					name: $('#name_'+file.index).val(),
					groups_id: groupid
				};
				if( type ==6 ){
					data.scenestyle = 6;
				}
			}
            $.post('/tokenitem/upload12', data, function(res){
                if(res.code&&res.code != 0){
                	toast.showmsg(res.msg);
                	return;
                }
                var token = res.token;
                var key = res.key;
                if(res.groupid){
                	groupid = res.groupid;
                }
	            toast.showmsg('开始上传');
                Q.addEvent("progress", function(p, s) {
					var eleProgress = $("#uploadProgress_" + file.index), percent = (p==100?99:p) + '%';
					if(eleProgress.is(":hidden")){
						eleProgress.show();
					}
					eleProgress.css("width",percent);	
                });
                //上传完成回调
                //fsize:文件大小(MB)
                //res:上传返回结果，默认为{hash:<hash>,key:<key>}
                Q.addEvent("putFinished", function(fsize, res, taking) {
                    $("#uploadProgress_" + file.index).hide();
                    $("#uploadSuccess_" + file.index).show();
					if(files[self.hadUpload+1]){
						self.hadUpload++;
						self.funUploadFile(files);
					}else{
						toast.showmsg('上传成功');
						// setTimeout(function(){
						// 	location.href="/panoitem";
						// }, 800);
						uploadtoast.scenekey = key.split('/')[2];
						console.log(uploadtoast.scenekey);
						setTimeout(function(){
							uploadtoast.uploadshow = true;
						},300)
					}
                });
                Q.SetToken(token);
                Q.Upload(file, key);
            });
		},
		funUploadSingleFile : function(file){
		},
		// 返回需要上传的文件
		funReturnNeedFiles : function(){
			return this.uploadFile;
		},
		
		// 初始化
		init : function(e,type){  // 初始化方法，在此给选择、上传按钮绑定事件
			var self = this;  // 克隆一个自身
			if (this.dragDrop) {
				this.dragDrop.addEventListener("dragover", function(e) { self.funDragHover(e); }, false);
				this.dragDrop.addEventListener("dragleave", function(e) { self.funDragHover(e); }, false);
				this.dragDrop.addEventListener("drop", function(e) { self.funGetFiles(e); }, false);
			}
			// 如果选择按钮存在
			if(self.fileInput){
				// 绑定change事件
				this.fileInput.addEventListener("change", function(e) {
					self.funGetFiles(e); 
				}, false);	
			}
			// 如果上传按钮存在
			if(self.uploadInput){
				// 绑定click事件
				this.uploadInput.addEventListener("click", function(e) {
					self.funUploadFiles(e); 
				}, false);	
			}
		}
};
