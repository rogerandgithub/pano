
function exportTo(type) {

	$('.table').tableExport({
		filename: '平台组周报',
		format: type,
		cols: '1,2,3,4,5,6,7'
	});

}