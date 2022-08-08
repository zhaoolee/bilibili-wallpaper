const superagent = require('superagent');
const fs = require('fs-extra');
const path = require('path');
const awaitWriteStream = require('await-stream-ready').write;

async function getUrlAndName() {
    // 用于存储返回值
    let imgAddrArray = [];
    // 请求资源
    let doc_list_json = JSON.parse(fs.readFileSync(path.join(__dirname, "doc_list.json")));
    console.log('==doc_list_json==', doc_list_json);
    let res_info = doc_list_json.data.items;
    res_info.map((res_info_value, res_info_index) => {
        let pic_description = res_info_value.title + res_info_value.description;
        res_info_value.pictures.map((pic_url, pic_index) => {
            let url_list = pic_url.img_src.split(".");
            let file_ext = url_list[url_list.length - 1];
            imgAddrArray.push([pic_url.img_src, pic_description + "-" + pic_index + "." + file_ext]);
        });
    });
    return imgAddrArray;
}
// 下载图片
async function download(imgAndName, index) {
    // 拼接出, 当前资源的文件名
    let filename = imgAndName[1];


    let file_exist_result = await new Promise(async (resolve, reject) => {

        fs.access(path.join(__dirname, 'images', index + "-" + filename), fs.constants.F_OK, (err) => {
            if (err) {
                resolve(false)
            } else {
                resolve(true)
            }
        });
    })

    // 如果文件存在则跳过
    console.log("==>>", file_exist_result, path.join(__dirname, 'images', index + "-" + filename))

    if (file_exist_result === true) {
        console.log(index + "-" + filename, "已下载完成！跳过~")

    } else {

        // 创建读取流
        const rs = superagent.get(imgAndName[0]);
        const ws = fs.createWriteStream(path.join(__dirname, 'images', index + "-" + filename));
        let bilibili_stream = rs.pipe(ws);
        ws.on('finish', () => {
            console.log(index + "-" + filename + "<==爬取完成");
            return filename;
        });
        await awaitWriteStream(bilibili_stream);
    }


}


// 获取最新的信息
async function getInfo() {
    // 记录当前页数
    let page_num = 0;
    // 记录是否继续循环
    let next = false;
    while (next === false) {
        // 读取cookies.txt内容，并基于cookies进行请求
        let cookieInfo = fs.readFileSync(path.join(__dirname, "cookie.txt"));
        await new Promise((resolve) => {
            superagent.get(`https://api.vc.bilibili.com/link_draw/v1/doc/doc_list?uid=6823116&page_num=${page_num}&page_size=20&biz=all`)
                .set('cookie', cookieInfo).end((err, res) => {

                    let resTextJson =  JSON.parse(res.text);

                    // 如果已经请求到底，则停止循环
                    if (resTextJson['data']['items'] === null || resTextJson['data']['items'].length === 0) {
                        // 过滤掉空元素
                        let newItems = [];
                        let doc_list_json = JSON.parse(fs.readFileSync(path.join(__dirname, "doc_list.json")));
                        for (let i = 0; i < doc_list_json.data.items.length; i++) {
                            if (doc_list_json.data.items[i] !== null) {
                                newItems.push(doc_list_json.data.items[i]);
                            }
                        }

                        doc_list_json.data.items = newItems;
                        fs.writeFileSync(path.join(__dirname, "doc_list.json"), JSON.stringify(doc_list_json));
                        next = true;
                    } else {
                        // 获取doc_list.json内容
                        let doc_list_json = JSON.parse(fs.readFileSync(path.join(__dirname, "doc_list.json")));
                        // 如果B站最新数据与doc_list.json中的内容相同, 则无需再次请求源
                        if (page_num === 0) {
                            if(doc_list_json.data && resTextJson['data']){
                                if(resTextJson['data']['items'][0].toString()
                                === doc_list_json.data.items[0].toString()){
                                    next = true;
                                    resolve();
                                }
                            } 
                            // 如果如果B站最新数据与doc_list.json中的内容不相同, 则更新数据
                            else{
                                fs.writeFileSync(path.join(__dirname, "doc_list.json"), res.text);
                            }
                        } 
                        // 持续更新数据
                        else {
                            if(resTextJson['data']['items'] !== null){
                                doc_list_json.data.items = [...doc_list_json.data.items, ...resTextJson['data']['items']];
                                fs.writeFileSync(path.join(__dirname, "doc_list.json"), JSON.stringify(doc_list_json));
                            }
                        }
                        // 为了避免请求频繁，每次请求完成后休眠2秒
                        page_num = page_num + 1;
                        setTimeout(() => {
                            resolve();
                        }, 2000)
                    }
                })
        })
    }
}

// 创建文件夹, 控制整体流程
async function init() {
    // 创建文件夹
    try {
        await fs.mkdir(path.join(__dirname, 'images'));
    }
    catch (err) {
        console.log("==>", err);
    }
    // 读取cookie.txt内容，将获取的信息写入doc_list.json
    await getInfo();
    let imgAddrArray = await getUrlAndName();
    for (let i = 0; i < imgAddrArray.length; i++) {
        try {
            let result = await download(imgAddrArray[i], (imgAddrArray.length - i).toString().padStart(6, "0"));
            console.log("还剩", imgAddrArray.length - i - 1, "张")
        }
        catch (err) {
            console.log("err==>", err);
        }
    }
    console.log("爬取完成，本次共爬取", imgAddrArray.length, "张")
}
init();