const express = require('express');
const cors = require('cors');
const { initialize } = require('./config/database');
const { errorHandler } = require('./middleware/errorMiddleware');
const routes = require('./routes');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api', routes);

// 错误处理中间件
app.use(errorHandler);

// 如果直接运行这个文件（不是作为模块导入）
if (require.main === module) {
  // 初始化数据库并启动服务器
  initialize()
    .then(() => {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

// 导出 app 以供测试使用
module.exports = app;