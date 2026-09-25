# crdtview

浏览器单页工作台（原生 ES 模块，零依赖）。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ ，改样例点运行看结果。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js

## 语义

- `clock.compare` 逐分量比较向量时钟，返回 `before` / `after` / `concurrent` / `equal`。
- `clock.mergeClocks` 逐分量取最大，返回新时钟，不修改入参。
- 时钟里出现 `nodes` 未声明的节点时抛出错误，错误对象 `code === "E_UNKNOWN_NODE"`。
- 合并为单次线性遍历（不排序分量），满足交换律与幂等；`converge` 会换序重算判定是否收敛。
