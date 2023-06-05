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
