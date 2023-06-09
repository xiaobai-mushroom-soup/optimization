# 问题一：浏览器从输入URL到页面加载完成，发生了什么？

 - 首先需要通过DNS将URL解析为对应的IP地址
 - 然后将客户端与这个IP地址确定的那台服务器建立起TCP网络链接
 - 随后向服务端抛出HTTP请求
 - 服务端处理完请求之后，将目标数据放在HTTP响应里返回给客户端
 - 拿到响应数据的浏览器就可以开始走一个渲染流程
 - 渲染完毕，页面就会呈现给用户了，并时刻等待响应用户的操作

 ## 优化阶段
  DNS优化方案：浏览器DNS缓存和DNS prefetch

 ## DNS解析阶段
 > 有DNS的地方，就有缓存。
 DNS查询顺序：浏览器缓存 -> 系统缓存 -> 路由缓存 -> ISP DNS缓存 -> 递归搜索
 ### 浏览器DNS缓存
 以chrome为例
 **查询DNS缓存时间**：chrome://net-internals/#dns
 (chrome对每个域名会默认缓存60s。)
 **查看chrome所有配置界面**：chrome://chrome-urls/
 **查看chrome浏览器的dns缓存信息**：chrome://dns或者chrome://net-internals/#dns
 
 问：如果一个域名解析结果有多个IP，浏览器如何处理？
 以Chrome为例，Chrome浏览器会优先向第一个IP发起HTTP请求，若不通，则再像后面的IP发起HTTP请求。

 缓存的好处：可以加快网站访问速度
 缓存的弊端：如果一个网站更换了ip那么就会因为缓存原因，造成无法访问的问题。【解决方案就是清空dns缓存】
 
 ### 操作系统DNS缓存
 
 OS缓存会参考DNS服务器响应的TTL值【但不完全等于TTL值】

> TTL(Time-to-Live) 指解析记录在本地DNS服务器中的缓存时间。

 Windows:Windows系统默认开启DNS缓存服务，叫做DNSClient,可以缓存一些常用的域名。
 > Windows查看电脑中已缓存域名： ipconfig/displaydns
 > Windows清空缓存记录： ipconfig/flushdns

 Linux:Linux系统的nscd服务可以实现DNS缓存功能。
 > nscd：nscd会缓存三种服务**passwd、group、hosts**，所以它会记录三个库，分别对应源  */etc/passwd*、*/etc/hosts*、*/etc/resolv.conf*  每个库保存两份缓存【一份时找到记录的，另一份是没有找到记录的】每一种缓存都保存有生存时间TTL。起作用就是增加cache，加快DNS的解析速度。
 > 配置文件为 */etc/nscd.conf* 默认该服务在redhat或centos下是关闭的，可以通过service nscd start开启。缓存DB文件在 */var/db/nscd* 下。可以通过nscd -g查看统计的信息，
 或者通过 string /var/db/nscd/hosts命令查看缓存文件

 清空缓存：
 1. nscd -i passwd
 2. nscd -i group
 3. nscd -i hosts

> 或者直接重启nscd服务，也可以清空cache。

 ## DNS Prefetching

 ### 概念：什么是DNS Prefetching？

 DNS Prefetching就是预先做DNS解析，将人类可理解的domain name，转为IP address。
 首先明确一点：**DNS Prefetching在https下是无法使用的！若想在https下开启DNS Prefetching 必须首先在`<head>`内加上`<meta http-equiv="x-dns-prefetch-control" content="on">`才可以启动DNS Prefetching。但是只能够启动链接，但无法启动手动设定的资源**

 ### 如何做？

 其实想做DNS Prefetching很简单:
 就是在HTML的`<head>`标签内加入：`<link rel="dns-prefetch" href="{对应的域名}">`
 当这样设置后，页面上`<a>`标签的链接，也都会开放DNS Prefetching

 ### 使用场景
 - 电商网站：商品页大量载入不同的domain下的商品图时
 - 手机网页，需要提高页面载入完成速度时

 如何查看dns载入速度对比？
 在chrome：可以进入about:histograms/DNS  查看

 ## TCP握手阶段
 TCP优化方案：使用**长连接**、**预链接**、**接入 SPDY 协议**；

 ### 长连接

 概念：
 长连接：指在一个连接上可以连续发送多个数据包，在连接保持期间，如果没有数据包发送，需要双方发链路检测包。
 短链接: 短连接（short connnection）是相对于长连接而言的概念，指的是在数据传送过程中，只在需要发送数据时，才去建立一个连接，数据发送完成后，则断开此连接，即每次连接只完成一项业务的发送。(HTTP就是短链接)

 长连接应用场景：
 长连接多用于操作频繁，点对点的通讯，而且连接数不能太多情况。
 【如数据库的连接使用长连接】

 短连接使用场景：
 短连接管理起来比较简单，存在的连接都是有用的连接，不需要额外的控制手段。
 【WEB网站的http服务一般都用短链接；】
 并发量大，且每个用户无需频繁操作的情况下使用短连接比较好。

 长连接短连接的区别主要在于客户端和服务端采取的关闭策略。短连接一般由客户端关闭链接，长连接一般由服务端关闭连接。【不是绝对的】

 ### 预连接

 预连接是一种资源提示，它会告诉浏览器与浏览器尚未确定需要建立的域建立主动HTTP连接。.

 如何做？
 想要使用预连接，只需要在浏览器`<head>`内添加`<link href="{自己的url}">`

 #### 如何使用预连接提高网站性能？

 1. 在日常发布\开发中，尽量使用预连接提高加载资源的速度
 2. 注意过多的预连接会损害性能，一般建议放置6-8个
 3. 不要预连接一个浏览器未曾使用过的域，因为有可能导致(1. 未知域会阻碍与其他域的连接；2. 未知域会额外占用浏览器资源，即使没有访问)
 4. 因为浏览器限制了它们将保持的HTTP连接数，所以如果10秒内没有请求发生，浏览器将关闭HTTP连接。当  预连接提示告诉浏览器打开到域的HTTP连接，但在10秒内没有向该域发送请求时，会发生Premature Preconnect 。浏览器然后关闭此连接，只有在需要从该域请求资源时才需要再次连接。
 5. 指定多个资源会禁用Safari的提示

 #### 如何判断资源需要使用预连接？

 - 后来在性能瀑布图中发现的域
 - 具有对页面呈现或交互至关重要的资源
 - 具有大量请求或下载大量内容的域

 举例：
 - 如关键渲染路径中需要具有CSS和JS包的其他域
 - Web字体由CSS引用，需要下载
 - 用于初始加载或呈现页面的API端点的第一方域

 ### SPDY 协议

 概念：spdy 是由google推行的，改进版本的HTTP1.1 （那时候还没有HTTP2）。它基于TCP协议，在HTTP的基础上，结合HTTP1.X的多个痛点进行改进和升级的产物。它的出现使web的加载速度有极大的提高。HTTP2也借鉴了很多spdy的特性。

 SPDY特性：
 - 多路复用
 - 头部压缩
 - 服务器推送
 - 请求优先级

因为HTTP3出现，此处不对SPDY协议深入研究

 ## HTTP优化

 对于HTTP优化，有两个大方向：
 1. 减少请求次数
 2. 减少单词请求所花费的时间

 和这两项最相关的就是最近流行的工程化打包工具：webpack（vite/rollup等），此处以webpack为例；

 ### webpack性能瓶颈

 webpack是非常强大的，但是再使用过程中，其需要优化的点有两方面：
 1. webpack构建过程花费时间过多
 2. webpack打包结果体积过大

 #### webpack优化策略

 ##### 策略一：构建过程提速策略

 webpack构建过程是相对比较缓慢的，其主要原因是loader的缘故。

 **loader-优化方案一**
 
 对于loader，最常使用的优化策略是：使用`include`或`exclude`来避免不必要的转译；
 如：babel官方给出的示例
 ```js
 module: {
  rules: [
    {
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }
  ]
}
 ```
 这段代码可以让babel避免去解析`node_modules`文件夹或`bower_components`文件夹。

 > 但是通过限定文件范围带来的性能提升是有限的。

**loader-优化方案二**

 除了排除部分文件夹外，我们还可以考虑使用缓存策略；
 即，开启缓存，并且将转译结果缓存至文件系统。
 我们只需要：
 ```js
 module: {
  rules: [
    {
      test: /\.m?js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader?cacheDirectory=true',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-proposal-object-rest-spread']
        }
      }
    }
  ]
}
 ```
> 对于loader方面：在对loader配置时，要考虑通过使用exclude去避免babel-loader 对不必要的文件的处理。

 **plugin-处理第三方库**

 第三方库有时候会非常大【如node_modules】,但是又不能缺少他们。

 我们可以：
 - 使用`CommonsChunkPlugin`，但是它会在每次构建时都会重新构建一次`vendor`
 - 使用`Externals`,可以排除部分应用程序
 - 【推荐】使用`DllPlugin`

 `DllPlugin`会把第三方库单独打包到一个文件中，这个文件就是一个单纯的依赖库。
 **这个依赖库不会跟着业务代码一起被重新打包，只有当依赖自身发生版本变化时才会重新打包**

 使用`DllPlugin`:
 - 基于dll专属的配置文件，打包dll库
 - 基于webpack.config.js文件，打包业务代码

```js
const path = require('path')
const webpack = require('webpack')

module.exports = {
    entry: {
      // 依赖的库数组
      vendor: [
        'prop-types',
        'babel-polyfill',
        'react',
        'react-dom',
        'react-router-dom',
      ]
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].js',
      library: '[name]_[hash]',
    },
    plugins: [
      new webpack.DllPlugin({
        // DllPlugin的name属性需要和libary保持一致
        name: '[name]_[hash]',
        path: path.join(__dirname, 'dist', '[name]-manifest.json'),
        // context需要和webpack.config.js保持一致
        context: __dirname,
      }),
    ],
}
```

 在编写完后，运行这个配置文件，dist文件夹内会出现`vendor-manifest.json` 、`vendor.js`

 > 其中`vendor.js`是我们第三方库打包的结果。
 > 而`vendor-manifest.json`则是用于描述每个第三方库对应的具体路径。

之后，我们只需要在`webpack.config.js`内针对`dll`稍作配置即可：

```js
const path = require('path');
const webpack = require('webpack')
module.exports = {
  mode: 'production',
  // 编译入口
  entry: {
    main: './src/index.js'
  },
  // 目标文件
  output: {
    path: path.join(__dirname, 'dist/'),
    filename: '[name].js'
  },
  // dll相关配置
  plugins: [
    new webpack.DllReferencePlugin({
      context: __dirname,
      // manifest就是我们第一步中打包出来的json文件
      manifest: require('./dist/vendor-manifest.json'),
    })
  ]
}
```

至此针对于`dll`的webpack构建过程结束。

 #### 策略二：开启webpack多进程处理loader【Happypack】
 
 webpack缺点是单线程，这样当存在多个任务的时候，还是只能一项一项的去执行。
 但是我们CPU是多核的，我们可以借助这个特性。
 在webpack中有一个插件叫`Happypack`，它可以让我们充分的利用CPU多核特性，帮我们将任务分发给多个子进程去并发执行，从而提高**打包效率**。

 使用：
 如果要使用`Happypack`,分三步走：
 1. 首先，需要手动创建一个进程池 
 2. 在配置loader的时候，为loader配置指定对应的的`Happypack`实例名字。
 3. 在`plugins`中注册`Happypack`，声明对应的`Happypack`实例名字;指定进程池(就是指定前面创建的进程池名称);指定对应的`loader`

```js
const HappyPack = require('happypack')
// 1. 手动创建进程池
const happyThreadPool =  HappyPack.ThreadPool({ size: os.cpus().length })

module.exports = {
  module: {
    rules: [
      ...
      {
        test: /\.js$/,
        // 2. 问号后面的查询参数指定了处理这类文件的HappyPack实例的名字
        loader: 'happypack/loader?id=happyBabel',
        ...
      },
    ],
  },
  plugins: [
    ...
    new HappyPack({
      // 3. 这个HappyPack的“名字”就叫做happyBabel，和楼上的查询参数遥相呼应
      id: 'happyBabel',
      // 指定进程池
      threadPool: happyThreadPool,
      loaders: ['babel-loader?cacheDirectory']
    })
  ],
}
```
 
 ### 查看webpack【可视化】构建结果

 可以使用`webpack bundle-analyzer`插件，来查看构建结果包大小占比可视化操作面板。
 **该插件将会把包内的各个模块的大小和依赖关系，以矩形树图的形式展现出来。**

 使用方式：

 ```js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
 
module.exports = {
  plugins: [
    new BundleAnalyzerPlugin()
  ]
}
 ```

 #### webpack优化3：Tree-Shaking

Tree-Shaking 是基于ES6的`import/export`语法的。
而Tree-Shaking 可以在编译过程中知道那些模块没有真正被使用到，而这些没有被使用到的代码，在最后打包的时候会被删掉。

**webpack**的Tree-Shaking适合处理模块级别的荣誉代码，对于粒度更细的冗余代码，一般会放在JS或CSS的压缩分离过程中去。

**优化3补充**：
对于JS/CSS代码压缩分离，当下webpack使用较多的为`UglifyJsPlugin`,它可以通过自定义去设置压缩相关的操作。
操作方法：
```js
  const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
  module.exports = {
  plugins: [
    new UglifyJsPlugin({
      // 允许并发
      parallel: true,
      // 开启缓存
      cache: true,
      compress: {
        // 删除所有的console语句    
        drop_console: true,
        // 把使用多次的静态值自动定义为变量
        reduce_vars: true,
      },
      output: {
        // 不保留注释
        comment: false,
        // 使输出的代码尽可能紧凑
        beautify: false
      }
    })
  ]
  }
```
> 上方是webpack3写法，在webpack4中已经默认使用了`uglifyjs-webpack-plugin`对代码进行压缩了，而在webpack4中，我们只需要配置`optimization.minimize`与`optimization.minimizer`来自定义压缩相关的操作。

 **webpack-按需加载**

 webpack按需加载主要是针对文件按需加载，比如当使用路由的时候：当所有组件都使用同步加载，如果页面非常的复杂，那么将会导致页面加载非常的卡顿。

 如果想要配置按需加载，首先第一步配置`webpack.config/js`：
 ```js
 output: {
    path: path.join(__dirname, '/../dist'),
    filename: 'app.js',
    publicPath: defaultSettings.publicPath,
    // 指定 chunkFilename
    chunkFilename: '[name].[chunkhash:5].chunk.js',
},
 ```

然后路由处：
```js
const getComponent => (location, cb) {
  require.ensure([], (require) => { // 注意这里
    cb(null, require('../pages/BugComponent').default)
  }, 'bug')
},
...
<Route path="/bug" getComponent={getComponent}>
```

上方使用到了
`require.ensure(dependencies, callback, chunkName)`
这是一个**异步方法**：当在webpack打包时，对应的组件文件将会被单独打包成一个文件，只有当我们访问这个组件时，这个异步方法的回调才会生效，这时候才会真正的去获取这个组件的内容，从而实现按需加载。

> 在React-Router4的按需加载是使用了Code-Splitting，而Code-Splitting底层用到了一个叫`Bundle-Loader`的东西，这个loader底层还是使用的`require.ensure`来实现的。

所谓的按需加载，根本上就是在正确的时机去触发响应的回调。
 ### 优化方案：Gzip原理
 
 如果我们想要开启Gzip，只需要在 request headers 中加上：
 ```
 accept-encoding:gzip
 ```
即可。
 #### HTTP压缩
 
 >HTTP压缩是一种内置到网页服务器和网页客户端中以改进传输速度和贷款利用率的方式。

 > 当在使用HTTP压缩的情况下，HTTP数据在从服务器发送前就已经压缩；当遇到兼容HTTP压缩的浏览器时，对应的浏览器将在下载所需的格式前告诉服务器支持哪种压缩方案；倘若浏览器不支持压缩，则浏览器将会下载未经过压缩的数据。

 常见的HTTP压缩方案：**Gzip**、**Deflate**。

 **Gzip内核就是Deflate。**
 
 ##### 原理解读

 经过Gzip压缩后通常可以帮助我们加快70%响应速度。
 但是Gzip并不能保证对每一个文件的压缩都会使其变小。

 Gzip原理：Gzip是在一个文本文件中找出一些重复的字符串，临时替换它们，从而让整个文件变小。
 根据上述原理，不难发现Gzip压缩率和代码重复率挂钩，重复率越高，则压缩率越高，收益便越大。

 Gzip实际上是服务器要做的工作，而我们的webpack内也有开启Gzip的方式。
 这两个该如何选择呢？
 - 首先，服务器开启Gzip必定是需要消耗性能的，而服务器性能不是无限的。
 - 当遇到大量的压缩任务堆积时，服务器就会卡顿，那么在用户体验方面并没有得到改善！
 - 因此webpack开启Gzip，实际上是在为服务器分担压力。

因此这两处Gzip压缩，并没有替代关系，而是相互配合的关系。在日常开发中也应该结合业务压力的实际强度情况，去做相应的权衡。