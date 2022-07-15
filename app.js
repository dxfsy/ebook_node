const { create } = require('domain')
const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const constant = require('./const')
const app = express()

app.use(cors())

app.get('/', (req, res) => {
    res.send(new Date().toDateString())
})

// 链接数据库
function connect() {
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'lvjiaqi',
        database: 'book',
    })
}

// 随机函数，n表示需要随机几个数，l表示最大数
function randomArray(n,l) {
    let rnd = []
    for(let i = 0;i < n;i++){
        rnd.push(Math.floor(Math.random() * l))
    }
    return rnd;
}



// 创建数据
function createData(results,key){
    return handleData(results[key])    
}

function handleData(data) {
    if(!data.cover.startsWith('http://')) {
        data['cover'] = `${constant.resUrl}/img${data.cover}`
    }
    data['selected'] = false
    data['private'] = false
    data['cached'] = false
    data['haveRead'] = 0
    return data
}

// guessYouLike数据
function createGuessYouLike(data){
    const type = parseInt(randomArray(1,3)) + 1
    data['type'] = type 
    switch(type) {
        case 1: 
            data['result'] = data.id % 2 === 0 ? '《Executing Magic》' : '《Elements Of Robotics》'
            break
        case 2:
            data['result'] = data.id % 2 === 0 ? '《Imporving Psychiatric Care》' : '《Programming Language》'
            break
        case 3:
            data['result'] = '《Living with Disfigurement》'
            data['percent'] = data.id % 2 === 0 ? '92%' : '97%'
            break
    }
    return data
}

// recommend数据
function createRecommend(data) {
    data['readers'] = Math.floor(data.id / 2 * randomArray(1,100))
    return data
}

// 创建category的id号
function createCategoryIds(n) {
    const arr = []
    constant.category.forEach((item,index)=> {
        arr.push(index+1)
    })
    const result = []
    for(let i=0;i<n;i++) {
        // 获取的随机数不能重复
        const ran = Math.floor(Math.random() * (arr.length - i))
        // 获取分类对应的序号
        result.push(arr[ran])
        // 将已经获取的随机数，用最后一位数取代
        arr[ran] = arr[arr.length-i-1]
    }
    return result
}

// categoryList数据
function createCategoryData(data) {
    const categoryIds = createCategoryIds(6)
    const result = []
    categoryIds.forEach((categoryId)=> {
        // 取前四本符合categoryId的书
        const subList = data.filter(item=>item.category === categoryId).slice(0,4)
        subList.map(item=> {
            return handleData(item)
        })
        result.push({
            category:categoryId,
            list:subList
        })
    })
    return result.filter(item=>item.list.length === 4)
}

// 获取首页书城的数据
app.get('/book/home',(req,res)=> {
    const conn = connect()
    conn.query("select * from book where cover!=\'\'",(err,results)=>{
        const length = results.length
        const guessYouLike = []
        const banner = constant.resUrl + '/home_banner2.jpg'
        const recommend = []
        const featured = []
        const random = []
        const categoryList = createCategoryData(results)
        const categories = constant.categories
        randomArray(9,length).forEach(key => {
            guessYouLike.push(createGuessYouLike(createData(results,key)))
        })
        randomArray(3,length).forEach(key=> {
            recommend.push(createRecommend(createData(results,key)))
        })
        randomArray(6,length).forEach(key=> {
            featured.push(createData(results,key))
        })
        randomArray(1,length).forEach(key=> {
            random.push(createData(results,key))
        })
        res.json({
            guessYouLike,
            banner,
            recommend,
            featured,
            random,
            categoryList,
            categories
        })
        conn.end()
    })
})

app.get('/book/detail',(req,res)=> {
    const conn = connect()
    const fileName = req.query.fileName
    const sql = `select * from book where fileName='${fileName}'`
    conn.query(sql,(err,results)=> {
        if(err) {
            res.json({
                error_code:1,
                msg:'获取电子书详情失败'
            })
        }else {
            if(results && results.length === 0 ) {
                res.json({
                    error_code:1,
                    msg:'获取电子书详情失败'
                })
            }else {
                const book = handleData(results[0])
                res.json({
                    error_code:0,
                    msg:'获取电子书详情成功',
                    data: book
                })
            }
        }
        conn.end()
    })
})

app.get('/book/list',(req,res)=> {
    const conn = connect()
    conn.query("select * from book where cover!=\'\'",(err,results)=> {
        if(err) {
            res.json({
                error_code:1,
                msg:'获取电子书分类列表失败'
            })
        }else {
            results.map(item=>handleData(item))
            const data = {}
            constant.category.forEach(categoryText=> {
                data[categoryText] = results.filter(item=> item.categoryText === categoryText)
            })
            res.json({
                error_code:0,
                msg:'获取电子书分类列表成功',
                data:data,
                total: results.length
            })
        }
        conn.end()
    })
})

app.get('/book/flat-list',(req,res)=> {
    const conn = connect()
    conn.query("select * from book where cover!=\'\'",(err,results)=> {
        if(err) {
            res.json({
                error_code:1,
                msg:'获取电子书失败'
            })
        }else {
            results.map(item=>handleData(item))
            res.json({
                error_code:0,
                msg:'获取成功',
                data:results,
                total: results.length
            })
        }
        conn.end()
    })
})

app.get('/book/shelf',(req,res)=> {
    res.json({
        bookList:[]
    })
})

const server = app.listen(3000, () => {
    const host = server.address().address
    const port = server.address().port
    console.log('server is listening at http://%s%s', host, port);
})