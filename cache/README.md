 # 缓存

 缓存的出现，就是为了减少网络IO的消耗，提高页面访问速度。
> 通过网络获取内容是非常缓慢的，需要经历客户端与服务端之间的数据连接和数据往返通信。
 
 浏览器缓存有：
 1. Memory Cache
 2. Serivice Worker Cache
 3. Http Cache
 4. Push Cache

 ## HTTP 缓存
 HTTP 缓存内部分为**强缓存**和**协商缓存**。
 浏览器会优先命中**强缓存**，当命中强缓存失败后，才会走**协商缓存**。

 ### 强缓存
 强缓存是利用http头部的`Expires`和`Cache-Control`两字段来控制的。
 
 **Expires**是http1.0提出的一个表示资源过期事件的header，它描述的是一个绝对时间，由服务器返回。
> 注意：expires受限于本地时间，如果修改了本地时间，可能会造成缓存失效。
```
Expires: Wed, 11 May 2018 07:20:00 GMT
```

**Cache-Control**出现于HTTP/ 1.1,其优先级高于`Expires`,它表示的是相对时间
```
Cache-Control: max-age=315360000
```

> 如果要进行向下兼容的话，建议两个都要设置；
> 现阶段常用的为`Cache-Control:max-age=xxxx`

在`Cache-Control`内除了**max-age**外还有**s-maxage**：

```
cache-control: max-age=3600, s-maxage=31536000
```
**s-maxage**的优先级高于**max-age**，同时存在时，客户端会优先使用**s-maxage**的时间戳。
**s-maxage**仅在代理服务器中生效，客户端中我们只考虑**max-age**

使用场景：
在普通项目中，仅有**max-age**，当存在着依赖着代理服务器的大型架构软件中时，这时候，就要考虑代理服务器缓存问题了。而**s-maxage**表示cache服务器上的缓存有效时间，*并且只对public缓存有效。*

**public资源缓存**与**private资源缓存**

public与private是针对资源能否被代理服务器缓存，所产生的一组对立的概念。

public资源缓存既可以被浏览器所缓存，也能够被服务器所缓存，如果想要开启，可以`Cache-Control:public`或为cache-control 添加 s-maxage。
private资源缓存只能够被浏览器所缓存，它是默认值。

**no-store**与**no-cache**
当`Cache-Control: no-store`时，则代表不采用任何的缓存策略。
当`Cache-Control: no-cache`时，则代表在发起请求时，绕过浏览器，去询问服务器资源缓存的情况。

 ### 协商缓存
 协商缓存：在这个机制下，当我们要通过浏览器发起请求向服务器请求相关资源的时候，浏览器会去服务器询问缓存的相关信息，然后再判断是否要重新发起请求、下载完整的响应，还是直接采用本地缓存资源。

 > 当浏览器向服务器询问，服务器回复`Not Modified`,这时，资源将会被重定向到浏览器缓存，这个情况下，这个网络请求所对应的网络状态码为**304**。

 **Last-Modified**与**Etag**
 
 `Last-Modified`是一个时间戳，当我们启用协商缓存，它会在首次请求时`Response Headers`中返回。
 
 ```
 Last-Modified: Fri, 27 Oct 2017 06:35:57 GMT
 ```

而随后的请求中，我们的`request Headers`都会携带上一个`If-Modified-Since`的时间戳字段，它的值来自于首次请求中，Response Headers返回来的 last-modified值： 

```
If-Modified-Since: Fri, 27 Oct 2017 06:35:57 GMT
```

> 当服务器接收到了这个时间戳后，将会对比该时间戳于服务器上最后修改时间是否一致。
> 如果不一致，则返回完整的相应内容，并返回新的`Last-Modified`值；
> 如果一致，则返回响应状态码304

使用`Last-Modified`弊端：
1. 当我们编辑了文件，但是文件内容没有改变。服务端不知道我们是否真正改变了文件，这时，服务端会拿这个新的时间戳与最后编辑时间进行判断；
    因此这个资源再次被请求时，会被当做新资源，进而会得到一个完整的响应；造成了额外的请求。
2. 当我们修改文件速度过快时，由于`If-Modified-Since`只能检查到以秒为计量单位的时间差，这时将会去走304策略，与我们实际预期不符。

`Last-Modified`弊端就是可能会存在，服务器无法判断文件是否被修改的情况。而`Etag`则是针对这个问题所产生的一个属性。

`Etag`是由服务器为每个资源生成的唯一的**标识字符串**，这个字符串是基于文件内容编码的，只要文件内容不同，那么所得到的`Etag`就是不一样的。`Etag`可以精确的感知文件的变化。

使用过程：
 - 首次请求时，服务端会返回一个ETag
```
ETag: W/"2a3b-1602480f459"
```
 - 在后序发起请求的时候，就会带上一个名为`if-None-Match`的字符串，让服务端进行比对
```
If-None-Match: W/"2a3b-1602480f459"
```

> Etag 的生成过程需要服务器额外付出计算开销，会影响服务端的性能。
> Etag 比Last-Modified更准确。优先级也更高。但使用时要权衡利弊。

 ## MemoryCache
MemoryCache是指在内存中的缓存。在优先级上评论，它是最先尝试去命中的一种缓存；在效率的角度考虑，它是响应速度最快的一种缓存。

被放入MemoryCache的文件：
 - Base64格式图片。
 - **体积小的**JS文件、CSS文件。

## Service Worker Cache
Service Worker是一种独立于主线程之外的JS线程。它脱离于浏览器窗体，无法直接访问DOM。
Service Worker可以帮助我们实现离线缓存、消息推送和网络代理。而通过Service worker实现的离线缓存就称为Service Worker Cache.

> Service worker必须是以https协议为前提。

## Push Cache

资料：https://jakearchibald.com/2017/h2-push-tougher-than-i-thought/

PushCache是指HTTP2在server push 阶段存在的缓存。
使用情况：
- 当浏览器没有命中前面任何一个缓存的时候，才会询问Push Cache缓存。
- Push Cache是一种存在于会话阶段的缓存，当session终止时，缓存即被释放。
- 不同的页面只要共享了同一个HTTP2连接，那么它们就可以共享同一个Push Cache。

 # 优化方案2：主动存储

 ## Cookie存储

 > Cookie最初是为了解决状态管理问题的。
 
 概念：Cookie是一个存储在浏览器里的一个**小小的**文件，它附着在HTTP请求上，在浏览器与服务器之间来回传递。
 它可以用于携带用户信息，以便于服务器通过Cookie获取客户端状态。

 Cookie以键值对的形式存在。(可以通过Chrome -> Application-> Cookies查看。)

 Cookie缺点：
 1. Cookie有体积限制(最大为4KB)，当超出时会被裁切。
 2. Cookie会紧跟域名，当频繁使用Cookie会造成性能浪费。
> 可以通过`Set-Cookie`指定需要存储的Cookie值，默认情况下domain被当作Cookie页面的主机名；

手动设置domain
```
Set-Cookie: name=dodo; domain=dodo.me
```

 **在同一域名下的所有请求，都会携带Cookie。**

## Web Storage
 Web Storage是HTML5新增的一个特性，它是一个专门为浏览器存储而诞生的存储机制；分为`Local Storage`和`Session Storage`。

 两者区别：
 - `Local Storage` 是存储在浏览器中的，存在其中的数据永远不会过期，只能手动删除；
 而`Session Storage`则是临时存储在浏览器中，当页面被关闭时，存储在其中的数据将会清空。
 - `Local Storage`、`Session Storage`、`Cookie`都遵守同源策略。
 但是`Session Storage`,即使在相同的域名下,只要它们不在同一个浏览器窗口中打开，那么`Session Storage`便无法共享【特殊情况：当由当前页面主动打开的新页面时(使用`window.open`或`<a rel="opener"></a>`)，这时候会复制Session Storage到新的页面。】
 
 **Web Storage**优点：容量比Cookie大【约5M~10M】、仅仅位于浏览器，不会携带在HTTP请求上。
 
 使用场景：Local Storage常用于持久存储，如：存储Base64图、小一点且不常更新的CSS、JS资源。

          Session Storage常用于浏览足迹，如：微博会记录上一个页面的地址。【因为这个地址仅仅是临时的，当切换的时候，就会更新，到别的URL下也用不到，所以使用Session Storage比较合适。】
 ## IndexedDB
 当存储内容超过10M时，则就可以考虑使用IndexdeDB。
 它是一个运行在浏览器上的非关系型数据库。

 # CDN缓存

 > CDN (`Content Delivery Network`,内容分发网络)指的是一组分布在各个地区的服务器。这些服务器存储着数据的副本，因此服务器可以根据服务器与用户的距离，来判断使用哪台服务器为用户提供数据，CDN提供快速服务，较少受高流量影响。

 当我们想要提升首次请求的响应能力时，会发现：尽量将前面的那些优化策略都做一遍后，还是很慢，这时候，就可以借助CDN来提升首次响应的速度。

 ## CDN核心
 
 CDN有两个核心：**缓存**、**回源**。
 `缓存`：缓存就是将资源复制一份到CDN服务器上的这个过程。
 `回源`：回源就是CDN发现自身服务器没有所请求的资源(一般是缓存的数据过期了)，会转头向根服务器(它的上层服务器)去请求这个资源的过程。

 ## CDN与性能优化

 CDN一般用于存放**静态资源**。而**跟服务器**本质上是业务服务器，它的核心任务在于生成动态页面或返回非纯静态页面。

 - `静态资源`：静态资源一般是JS、CSS、图片等【**像这类不需要业务服务器进行计算而得到的资源**】
 - `动态资源`：动态资源是后端*实时*生成的动态数据
 - `非纯静态资源`：非纯静态资源指的是需要服务器在页面之外做额外计算的HTML页面。【举例：进入后权限判断，进入的新页面，虽然页面是静态，但是有权限这一计算操作，将页面与业务相耦合，这就是非纯静态页面。】

## CDN实际应用

静态资源走CDN是一个规定！
因为静态资源本身具有访问频率高、承接流量大的特点。

比如：淘宝。

## CDN优化细节
CDN服务器域名不可以与业务服务器域名相同。
业务服务器一般都会携带Cookie。
而Cookie的携带，对于去请求静态资源而言，这无疑会造成性能浪费。
所以在使用时，CDN服务器域名与业务服务器域名不可相同。
