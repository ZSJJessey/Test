# TestMail

一个简易邮箱页面（本地示例数据），用于演示“左侧邮件列表 + 右侧邮件详情”的基础交互。

## 本地启动

在 `TestMail/` 目录下执行：

```bash
npm i
npm run dev
```

然后访问 `http://localhost:5173/`。

## 发布到 GitHub Pages（本地 build 后部署）

1. 在 `TestMail/` 目录执行：

```bash
npm i
npm run build:pages
```

2. 这会把打包产物从 `TestMail/dist` 同步到仓库根目录的 `docs/`。

3. 提交并推送到 GitHub：

```bash
git add docs TestMail
git commit -m "build: publish TestMail to docs for GitHub Pages"
git push
```

4. 在 GitHub 仓库设置中配置 Pages：
   - `Settings -> Pages`
   - `Source: Deploy from a branch`
   - `Branch: main`
   - `Folder: /docs`

5. 发布地址：
   - `https://<你的GitHub用户名>.github.io/Test/`

