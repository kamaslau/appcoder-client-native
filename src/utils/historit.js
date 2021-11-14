const fs = require('fs-extra')

// 检查文件是否存在，若否则迭代创建文件（含路径）
const touchFile = (path) => {
  try {
    fs.ensureFileSync(path)
  } catch (error) {
    console.error('touchFile error: ', error)
  }
}

// 写入文件
const writeFile = (path, content) => {
  console.log('writeFile: ')

  try {
    fs.writeJson(path, content)
  } catch (error) {
    console.error('writeFile error: ', error)
  }
}

// 读取文件
const readFile = (path) => {
  // console.log('readFile: ')

  let content = null

  try {
    content = fs.readJsonSync(path) ?? null
  } catch (error) {
    console.warn('readFile error: ', error)
  }

  return content
}

class Historit {
  constructor(filePath, keys) {
    this.filePath = filePath

    if (Array.isArray(keys)) {
      this.keys = keys
    } else {
      console.error(`initFile error: history keys should be a string array, ${typeof keys} found.`)

      this.keys = []
    }

    this.initFile()
  }

  initFile(keys) {
    touchFile(this.filePath)

    let content = readFile(this.filePath)

    // 初始化内容
    if (content === null) {
      content = {}
      this.keys.forEach(item => { content[item] = [] })
      writeFile(this.filePath, content)
    }

    return content
  }

  create(key, value) {
    const content = this.findMany()
    console.log(content[key])
    content[key] = Array.from(new Set([...content[key], value])) // 去重

    writeFile(this.filePath, content)

    return content
  }

  update(key, payload) {
    const content = this.findMany()
    console.log(content[key])

    content[key] = payload // 覆盖

    writeFile(this.filePath, content)

    return content
  }

  findMany(key = null) {
    const content = readFile(this.filePath)

    return key === null ? content : content[key]
  }

  remove(key = null) {
    let content = {}

    if (key === null) {
      // remove all
    } else {
      // remove keyed
      content = this.findMany()
      content[key] = []
    }

    writeFile(this.filePath, content)

    return content // 返回所有记录
  }
}

module.exports = Historit
