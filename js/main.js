/* ===========================================================
   鞋类推广页 - 交互逻辑
   功能：Toast 提示、Clipboard 复制、图片懒加载、
        微信弹窗、滚动入场动画、底部操作栏
   =========================================================== */
(function () {
    'use strict';

    /* ---------- 微信号（统一配置，便于维护） ---------- */
    var WECHAT_ID = 'TFYTXXAY';

    /* ---------- Toast 提示 ---------- */
    var toastTimer = null;
    function showToast(message, type) {
        var toast = document.getElementById('toast');
        if (!toast) return;

        toast.innerHTML = '';
        var icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.textContent = (type === 'success') ? '✓' : '!';
        var text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(icon);
        toast.appendChild(text);

        toast.className = 'toast' + (type === 'success' ? ' success' : '');
        // 触发重排以重启动画
        void toast.offsetWidth;
        toast.classList.add('show');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('show');
        }, 1800);
    }

    /* ---------- 复制到剪贴板（Clipboard API + 降级） ---------- */
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () {
                showToast('微信号已复制', 'success');
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.select();
        try {
            var ok = document.execCommand('copy');
            if (ok) {
                showToast('微信号已复制', 'success');
            } else {
                showToast('复制失败，请手动长按复制', '');
            }
        } catch (e) {
            showToast('复制失败，请手动长按复制', '');
        }
        document.body.removeChild(textarea);
    }

    /* ---------- 微信弹窗 ---------- */
    function openWechatModal() {
        var mask = document.getElementById('wechatMask');
        var modal = document.getElementById('wechatModal');
        if (mask && modal) {
            mask.classList.add('show');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeWechatModal() {
        var mask = document.getElementById('wechatMask');
        var modal = document.getElementById('wechatModal');
        if (mask && modal) {
            mask.classList.remove('show');
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    /* ---------- 图片懒加载 ---------- */
    function initLazyLoad() {
        var imgs = document.querySelectorAll('img[data-src]');
        if (!imgs.length) return;

        if (!('IntersectionObserver' in window)) {
            // 不支持则直接全部加载
            imgs.forEach(function (img) {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
            });
            return;
        }

        var io = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    var src = img.getAttribute('data-src');
                    if (src) {
                        // 先绑定错误处理（用于替换为占位符），再赋值 src
                        img.addEventListener('error', function errOnce() {
                            img.removeEventListener('error', errOnce);
                            replaceWithPlaceholder(img);
                        });
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '200px 0px',
            threshold: 0.01
        });

        imgs.forEach(function (img) { io.observe(img); });
    }

    /* ---------- 滚动入场动画 ---------- */
    function initRevealAnimation() {
        var reveals = document.querySelectorAll('.reveal');
        if (!reveals.length) return;

        if (!('IntersectionObserver' in window)) {
            reveals.forEach(function (el) { el.classList.add('visible'); });
            return;
        }

        var io = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        reveals.forEach(function (el) { io.observe(el); });
    }

    /* ---------- 事件委托 ---------- */
    function initEvents() {
        document.addEventListener('click', function (e) {
            var target = e.target;

            // 复制按钮（带 data-copy 属性）
            var copyBtn = target.closest('[data-copy]');
            if (copyBtn) {
                e.preventDefault();
                var text = copyBtn.getAttribute('data-copy') || WECHAT_ID;
                copyText(text);
                return;
            }

            // 弹窗关闭按钮
            if (target.closest('.modal-close')) {
                closeWechatModal();
                return;
            }

            // 点击遮罩关闭
            if (target.id === 'wechatMask') {
                closeWechatModal();
                return;
            }

            // 底部操作栏 / 打开微信按钮
            if (
                target.closest('.btn-wechat') ||
                target.closest('.btn-cta') ||
                target.closest('[data-action="open-wechat"]')
            ) {
                e.preventDefault();
                openWechatModal();
                return;
            }

            // 弹窗内打开微信
            if (target.closest('[data-action="launch-wechat"]')) {
                // 让浏览器尝试唤起微信，不阻止默认行为
                closeWechatModal();
                return;
            }
        });

        // ESC 关闭弹窗
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                closeWechatModal();
            }
        });
    }

    /* ---------- 图片兜底：加载失败 → SVG 占位符 + 搜索关键词 ---------- */
    // 默认关键词映射（根据图片路径片段或 data-keyword 识别）
    var DEFAULT_KEYWORDS = {
        '01': '莆田运动鞋 产品实拍',
        '02': '潮牌运动鞋 新款',
        '03': '休闲跑鞋 工厂直销',
        '04': '篮球鞋 复刻',
        '05': '板鞋 一件代发',
        '06': '老爹鞋 代理货源',
        '07': '空军一号 莆田',
        '08': '椰子鞋 Yeezy',
        '09': 'AJ 乔丹 高帮',
        '10': '跑鞋 减震 透气',
        '11': '帆布鞋 百搭',
        '12': '运动潮鞋 爆款',
        '21': '鞋厂 做工 细节',
        '22': '车线工艺 鞋底',
        '23': '鞋面材料 实拍',
        '24': '鞋底 开模 复刻',
        '25': '鞋垫 做工细节',
        '26': '鞋厂 流水线',
        '20180426094305': '仓库 鞋类 货源 现货',
        '20180424162746': '生产线 运动鞋 工厂',
        '20180424162752': '生产车间 流水线实拍',
        'abc4cbfce2ad82d7c26de5e992b090f8': '公司简介 工厂资质',
        'code': '微信二维码 联系客服'
    };

    function resolveKeyword(img) {
        var k = img.getAttribute && img.getAttribute('data-keyword');
        if (k) return k;
        var src = (img.src || img.getAttribute('data-src') || '').toLowerCase();
        for (var key in DEFAULT_KEYWORDS) {
            if (DEFAULT_KEYWORDS.hasOwnProperty(key) && src.indexOf(key) !== -1) {
                return DEFAULT_KEYWORDS[key];
            }
        }
        return '鞋类 产品图';
    }

    // 生成占位 SVG（data URI，避免跨域）
    function buildPlaceholderSVG(keyword) {
        var safeKeyword = String(keyword || '鞋类 产品图')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // 拆词换行（每 6 个字符一行，最多 3 行）
        var chars = safeKeyword.split('');
        var lines = [];
        for (var i = 0; i < chars.length && lines.length < 3; i += 6) {
            lines.push(chars.slice(i, i + 6).join(''));
        }
        var textY = 150 - (lines.length - 1) * 18;
        var textTpl = lines.map(function (line, idx) {
            return '<text x="50%" y="' + (textY + idx * 32) + '" text-anchor="middle" ' +
                'font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="22" ' +
                'font-weight="600" fill="rgba(255,207,23,0.95)">' + line + '</text>';
        }).join('');

        var svg = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">' +
            '<defs>' +
            '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#2d0f0f"/>' +
            '<stop offset="100%" stop-color="#1a0510"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="300" height="300" fill="url(#bg)"/>' +
            // 装饰边框
            '<rect x="8" y="8" width="284" height="284" fill="none" ' +
            'stroke="rgba(255,41,41,0.35)" stroke-width="2" rx="12" ry="12"/>' +
            // 小图标：鞋轮廓（简化）
            '<g transform="translate(150,95)" opacity="0.85">' +
            '<path d="M-60 28 Q-70 8 -40 0 Q-10 -12 20 -4 Q55 4 62 24 ' +
            'L58 36 L-56 36 Z" fill="none" stroke="rgba(255,207,23,0.9)" ' +
            'stroke-width="3" stroke-linejoin="round"/>' +
            '</g>' +
            // 关键词文字
            textTpl +
            // 搜索提示
            '<text x="50%" y="272" text-anchor="middle" ' +
            'font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="12" ' +
            'fill="rgba(255,255,255,0.45)">↑ 以上为搜索关键词 · 图片占位</text>' +
            '</svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    function replaceWithPlaceholder(img) {
        if (!img || img.__placeholderApplied) return;
        // 防止死循环
        img.__placeholderApplied = true;
        var keyword = resolveKeyword(img);
        try {
            img.src = buildPlaceholderSVG(keyword);
            img.removeAttribute('data-src');
            img.style.objectFit = 'contain';
            img.alt = keyword;
            // 给父级添加占位类（用于CSS样式，非必须）
            if (img.parentElement && !img.parentElement.classList.contains('placeholder-box')) {
                img.parentElement.classList.add('placeholder-box');
            }
        } catch (e) {
            // 最后的兜底：隐藏破图显示背景
            img.style.visibility = 'hidden';
        }
    }

    function initImageFallback() {
        // 1) 捕获阶段：覆盖在脚本运行前已绑定 error 的图片
        document.addEventListener('error', function (e) {
            var target = e.target;
            if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
                replaceWithPlaceholder(target);
            }
        }, true);

        // 2) 扫描脚本加载前可能已失败的图片（readyState 或 naturalWidth 检查）
        var scan = function () {
            var all = document.querySelectorAll('img');
            all.forEach(function (img) {
                if (img.__placeholderApplied) return;
                // 已经加载过的图片（data-src 尚未赋值不算）
                if (img.src && !img.getAttribute('data-src')) {
                    if (img.complete) {
                        if (img.naturalWidth === 0) {
                            replaceWithPlaceholder(img);
                        }
                    } else {
                        // 还在加载中，绑定 onerror
                        img.addEventListener('error', function once() {
                            img.removeEventListener('error', once);
                            replaceWithPlaceholder(img);
                        });
                    }
                }
            });
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scan);
        } else {
            scan();
        }
    }

    /* ---------- 防止移动端触摸穿透 ---------- */
    function preventTouchThrough() {
        var mask = document.getElementById('wechatMask');
        if (!mask) return;
        mask.addEventListener('touchmove', function (e) {
            e.preventDefault();
        }, { passive: false });
    }

    /* ---------- 初始化 ---------- */
    function init() {
        initImageFallback();
        initLazyLoad();
        initRevealAnimation();
        initEvents();
        preventTouchThrough();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
