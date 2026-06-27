# Excalidraw Persist_cn

基于 `Excalidraw Persist` 的中文汉化版本，适合自托管部署和个人使用。

## 原有功能介绍

- 服务端持久化保存画板、图片和素材库
- 支持多个画板/标签页切换
- 支持已删除画板回收站
- 使用 SQLite，部署简单

## 本次修改

- 前端界面汉化，包括按钮、弹窗、提示文案等
- 后端接口返回和常见错误提示汉化
- 默认语言切换为中文
- 浏览器标题调整为 `无限画布`
- 新增单密码登录功能，适合个人自用，不做多用户系统

## Docker 部署

镜像地址：

```text
ghcr.io/weidaye1122/excalidraw-persist_cn:latest
```

`docker-compose.yml` 示例：

```yaml
version: "3.8"

services:
  excalidraw-persist:
    container_name: weidaye1122_excalidraw-persist_cn
    image: ghcr.io/weidaye1122/excalidraw-persist_cn:latest
    restart: always
    ports:
      - "8180:80"
      - "4001:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DB_PATH=/app/data/database.sqlite
      - LOGIN_PASSWORD=你的访问密码
      - LOGIN_SESSION_SECRET=一串更长的随机字符串
    volumes:
      - ./data:/app/data
```

部署后访问：

```text
http://你的服务器IP:8180
```
