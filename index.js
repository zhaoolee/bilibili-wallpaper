const superagent = require('superagent');
const fs = require('fs-extra');
const path = require('path');
const awaitWriteStream = require('await-stream-ready').write;
const { resolve } = require('path');
async function getUrlAndName(){
    // 用于存储返回值
    let imgAddrArray = [];
    // 请求资源
    let res_json = JSON.parse(fs.readFileSync(path.join(__dirname, "doc_list.json")));
    let res_info = res_json.data.items;
    res_info.map((res_info_value, res_info_index)=>{
        let pic_description = res_info_value.title+res_info_value.description;
        res_info_value.pictures.map((pic_url, pic_index)=>{
            let url_list = pic_url.img_src.split(".");
            let file_ext = url_list[url_list.length-1];
            imgAddrArray.push([pic_url.img_src, pic_description+"-"+pic_index+"."+file_ext]);
        });
    });
    return imgAddrArray;
}
// 下载图片
async function download(imgAndName,index){
    // 拼接出, 当前资源的文件名
    let filename = imgAndName[1];


    let file_exist_result = await new Promise(async(resolve, reject)=>{

        fs.access(path.join(__dirname, 'images', index+"-"+filename), fs.constants.F_OK, (err) => {
            if (err) {
                resolve(false)
            } else {
                resolve(true)
            }
        });



    })

    // 如果文件存在则跳过
    console.log("==>>", file_exist_result, path.join(__dirname, 'images', index+"-"+filename))
    

    
    if(file_exist_result === true){
        console.log(index+"-"+filename, "已下载完成！跳过~")

    }else{

        // 创建读取流
        const rs = superagent.get(imgAndName[0]);
        const ws = fs.createWriteStream(path.join(__dirname, 'images', index+"-"+filename));
        let bilibili_stream = rs.pipe(ws);
        ws.on('finish', ()=>{
            console.log(index+"-"+filename+"<==爬取完成");
            return filename;
        });
        await awaitWriteStream(bilibili_stream);
    }


}
// 创建文件夹, 控制整体流程
async function init(){
    // 创建文件夹
    try{
        await fs.mkdir(path.join(__dirname, 'images'));
    }
    catch(err){
        console.log("==>", err);
    }
    let imgAddrArray = await getUrlAndName();
    for (let i=0; i<imgAddrArray.length; i++){
        try{
            let result = await download(imgAddrArray[i], (imgAddrArray.length-i).toString().padStart(6, "0"));
            console.log("还剩", imgAddrArray.length-i-1, "张")
        }
        catch(err){
            console.log("err==>", err);
        }
    }
    console.log("爬取完成，共", imgAddrArray.length, "张")
}
init();