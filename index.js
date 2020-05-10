const superagent = require('superagent');
const fs = require('fs-extra');
const path = require('path');
const awaitWriteStream = require('await-stream-ready').write;
let url = 'https://api.vc.bilibili.com/link_draw/v1/doc/doc_list?uid=6823116&page_num=0&page_size=500&biz=all';
async function getUrlAndName(){
    // 用于存储返回值
    let imgAddrArray = [];
    // 请求资源
    const res = await superagent.get(url)
        .set({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        }).timeout({ response: 5000, deadline: 60000 });
    let res_json = JSON.parse(res.text);
    let res_info = res_json.data.items;
    res_info.map((res_info_value, res_info_index)=>{
        let pic_description = res_info_value.title+res_info_value.description;
        res_info_value.pictures.map((pic_url, pic_index)=>{
            let url_list = pic_url.img_src.split(".");
            let file_ext = url_list[url_list.length-1];
            imgAddrArray.push([pic_url.img_src, pic_description+"-"+pic_index+Date.parse(new Date())+"."+file_ext]);
        });
    });
    return imgAddrArray;
}
// 下载图片
async function download(imgAndName){
    // 拼接出, 当前资源的文件名
    let filename = imgAndName[1];
    // 创建读取流
    const rs = superagent.get(imgAndName[0]);
    const ws = fs.createWriteStream(path.join(__dirname, 'images', filename));
    let bilibili_stream = rs.pipe(ws);
    ws.on('finish', ()=>{
        console.log(filename+"<==爬取完成");
        return filename;
    });
    await awaitWriteStream(bilibili_stream);
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
            let result = await download(imgAddrArray[i]);
        }
        catch(err){
            console.log("err==>", err);
        }
    }
}
init();