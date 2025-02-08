# Obsidian 图片上传插件

这是一个 Obsidian 插件，允许用户通过右键菜单将文档中的图片上传到指定的服务器。

## 功能

- 在文档中右键点击图片，可以将图片上传到指定服务器
- 支持自定义上传服务器地址
- 上传成功后会显示提示信息

## 安装

1. 下载此仓库
2. 将文件复制到你的 Obsidian vault 的 `.obsidian/plugins/image-uploader/` 目录下
3. 在 Obsidian 设置中启用插件
4. 在插件设置中配置服务器地址

## 使用方法

1. 在 Obsidian 设置中配置上传服务器地址
2. 在文档中右键点击图片
3. 选择"上传图片到服务器"选项
4. 等待上传完成

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 许可证

MIT 