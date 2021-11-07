# tests/README.md

在需求初步稳定后，应及时完成测试用例的编写。

其中，对于 ` /src ` 目录中的以下目录，测试覆盖率目标为100%：

``` plaintext
components 组件
pages 页面
plugins 插件
services 服务
```

对于以下目录，首先应确认所使用版本的第三方库自身的测试覆盖率如何，是否对于本项目中已使用的模块/方法进行了覆盖，并据此决定是否需要对其进行补充测试。

``` plaintext
/libs
```
