import { captureFullPage } from './screenshotManager.js';
import { getAllTabs } from './tabManager.js';
import { toggleEffect } from './effectsManager.js';
import { BorderManager } from './borderManager.js';

// 等待DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup script loaded and DOM is ready');
    
    // 添加显示标签页按钮的事件监听
    document.getElementById('showTabs').addEventListener('click', async () => {
        try {
            const tabs = await getAllTabs({ currentWindow: true });
            const tabsList = document.getElementById('tabs-list');
            
            // 清空之前的列表
            tabsList.innerHTML = '';
            
            // 创建标签页列表
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '10px';
            ul.style.margin = '10px 0';
            ul.style.maxHeight = '200px';
            ul.style.overflowY = 'auto';
            ul.style.border = '1px solid #ccc';
            ul.style.borderRadius = '4px';
            
            tabs.forEach((tab, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}. ${tab.title}`;
                li.style.padding = '5px 0';
                li.style.borderBottom = '1px solid #eee';
                li.style.fontSize = '12px';
                li.style.whiteSpace = 'nowrap';
                li.style.overflow = 'hidden';
                li.style.textOverflow = 'ellipsis';
                ul.appendChild(li);
            });
            
            tabsList.appendChild(ul);
        } catch (error) {
            console.error('Error showing tabs:', error);
            document.getElementById('tabs-list').innerHTML = 
                `<p style="color: red;">获取标签页失败: ${error.message}</p>`;
        }
    });

    // 添加下雨特效按钮事件监听
    document.getElementById('rainEffect').addEventListener('click', async () => {
        const button = document.getElementById('rainEffect');
        const isEffectOn = await toggleEffect('rain');
        button.textContent = isEffectOn ? '🌧️ 关闭下雨' : '🌧️ 下雨特效';
    });

    // 添加下雪特效按钮事件监听
    document.getElementById('snowEffect').addEventListener('click', async () => {
        const button = document.getElementById('snowEffect');
        const isEffectOn = await toggleEffect('snow');
        button.textContent = isEffectOn ? '❄️ 关闭下雪' : '❄️ 下雪特效';
    });

    // 添加边框按钮事件监听
    document.getElementById('addBorders').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: toggleBorders
        });
    });
});

// 监听来自contentscript的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'mousePosition') {
        document.getElementById('current-pos').textContent = `X:${message.x}, Y:${message.y}`;
        document.getElementById('x-coord').value = message.x;
        document.getElementById('y-coord').value = message.y;
    } else if (message.type === 'mouseClick') {
        document.getElementById('last-click-pos').textContent = `X:${message.x}, Y:${message.y}`;
    } else if (message.type === 'selectorCopied') {
        const statusText = document.getElementById('status-text') || createStatusElement();
        statusText.textContent = '✅ 选择器已复制到剪贴板';
        statusText.style.color = '#4CAF50';
        
        setTimeout(() => {
            statusText.textContent = '';
        }, 2000);
    } else if (message.type === 'elementSelector') {
        // 复制选择器到剪贴板
        navigator.clipboard.writeText(message.selector).then(() => {
            const statusText = document.getElementById('status-text') || createStatusElement();
            statusText.textContent = '✅ 选择器已复制: ' + message.selector;
            statusText.style.color = '#4CAF50';
            
            setTimeout(() => {
                statusText.textContent = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy selector:', err);
            const statusText = document.getElementById('status-text') || createStatusElement();
            statusText.textContent = '❌ 复制失败';
            statusText.style.color = 'red';
        });
    }
});

document.getElementById('click-btn').addEventListener('click', async () => {
    const x = parseInt(document.getElementById('x-coord').value);
    const y = parseInt(document.getElementById('y-coord').value);

    if (isNaN(x) || isNaN(y)) {
        alert('请输入有效的坐标');
        return;
    }

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: simulateClick,
        args: [x, y]
    });
});

function simulateClick(x, y) {
    const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
    });

    document.elementFromPoint(x, y)?.dispatchEvent(clickEvent);
}

// popup 打开时，获取最后存储的位置
chrome.runtime.sendMessage({ type: 'getLastPosition' }, (response) => {
    if (response) {
        // 更新鼠标位置
        document.getElementById('current-pos').textContent = `X:${response.mousePosition.x}, Y:${response.mousePosition.y}`;
        document.getElementById('x-coord').value = response.mousePosition.x;
        document.getElementById('y-coord').value = response.mousePosition.y;
        
        // 更新最后点击位置
        document.getElementById('last-click-pos').textContent = `X:${response.clickPosition.x}, Y:${response.clickPosition.y}`;
    }
});

// 继续监听实时更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'mousePosition') {
    // ... 更新UI的代码 ...
  }
});

// 添加截屏按钮事件监听
document.getElementById('captureFullPage').addEventListener('click', async () => {
    try {
        const button = document.getElementById('captureFullPage');
        const statusText = document.getElementById('status-text') || createStatusElement();
        
        button.disabled = true;
        button.textContent = '截图中...';
        statusText.textContent = ''; // 清除之前的状态
        
        await captureFullPage();
        
        button.textContent = '截图成功！';
        statusText.textContent = '✅ 截图已保存';
        
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '📸 截取整页';
            statusText.textContent = '';
        }, 2000);
    } catch (error) {
        console.error('Screenshot failed:', error);
        const button = document.getElementById('captureFullPage');
        const statusText = document.getElementById('status-text') || createStatusElement();
        
        button.textContent = '截图失败';
        statusText.textContent = `❌ 错误: ${error.message}`;
        statusText.style.color = 'red';
        
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '📸 截取整页';
        }, 2000);
    }
});

// 创建状态文本元素的辅助函数
function createStatusElement() {
    const statusText = document.createElement('div');
    statusText.id = 'status-text';
    statusText.style.marginTop = '10px';
    statusText.style.textAlign = 'center';
    document.getElementById('captureFullPage').parentNode.appendChild(statusText);
    return statusText;
}

// 添加自动滚动按钮事件监听
document.getElementById('autoScroll').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 执行自动滚动脚本
    await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: autoScrollPage
    });
});

// 自动滚动函数
function autoScrollPage() {
    let lastScrollTop = -1;
    const scrollInterval = setInterval(() => {
        // 每次滚动100像素
        window.scrollBy(0, 100);
        
        // 如果滚动位置没有变化，说明已经到底了
        if (lastScrollTop === window.scrollY) {
            clearInterval(scrollInterval);
            console.log('Reached bottom of page');
            return;
        }
        
        lastScrollTop = window.scrollY;
    }, 100); // 每100毫秒滚动一次
}

// 添加选择器按钮的事件监听
document.getElementById('move-to-selector').addEventListener('click', async () => {
    const selector = document.getElementById('selector-input').value;
    if (!selector) {
        alert('请输入选择器');
        return;
    }

    const statusText = document.getElementById('status-text');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.runtime.sendMessage({
            action: 'moveToSelector',
            selector: selector
        });

        if (response.success) {
            statusText.textContent = '已移动到元素位置';
        } else {
            statusText.textContent = response.error || '操作失败';
        }
    } catch (error) {
        statusText.textContent = '发生错误: ' + error.message;
    }
});

// 添加边框处理函数
function toggleBorders() {
    if (!window._borderManager) {
        class BorderManager {
            constructor() {
                this.borderedElements = new Set();
                this.isActive = false;
                // 扩展有效元素列表
                this.VALID_ELEMENTS = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'form', 'ul', 'ol'];
                this.MIN_ELEMENT_SIZE = 30; // 降低最小尺寸限制
            }

            isValidElement(element) {
                const rect = element.getBoundingClientRect();
                
                // 检查元素大小
                if (rect.width < this.MIN_ELEMENT_SIZE || rect.height < this.MIN_ELEMENT_SIZE) {
                    return false;
                }

                // 检查标签名
                if (!this.VALID_ELEMENTS.includes(element.tagName.toLowerCase())) {
                    return false;
                }

                // 如果元素已经有边框了，就跳过
                if (this.borderedElements.has(element)) {
                    return false;
                }

                // 检查元素是否有内容或子元素
                const hasContent = element.textContent.trim().length > 0 || element.children.length > 0;
                if (!hasContent) {
                    return false;
                }

                // 检查元素是否可见
                const style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    return false;
                }

                return true;
            }

            addBorder(element) {
                const originalStyle = element.getAttribute('style') || '';
                element.style.border = '2px solid red';
                element.style.boxSizing = 'border-box';
                element.dataset.originalStyle = originalStyle;
                this.borderedElements.add(element);
            }

            removeBorder(element) {
                if (element.dataset.originalStyle) {
                    element.setAttribute('style', element.dataset.originalStyle);
                } else {
                    element.removeAttribute('style');
                }
                delete element.dataset.originalStyle;
                this.borderedElements.delete(element);
            }

            toggle() {
                this.isActive = !this.isActive;
                return this.isActive;
            }

            clearAllBorders() {
                this.borderedElements.forEach(element => {
                    this.removeBorder(element);
                });
                this.borderedElements.clear();
            }
        }
        window._borderManager = new BorderManager();
    }

    const isActive = window._borderManager.toggle();

    if (isActive) {
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            if (window._borderManager.isValidElement(element)) {
                window._borderManager.addBorder(element);
            }
        });

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && window._borderManager.isValidElement(node)) {
                        window._borderManager.addBorder(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        window._borderObserver = observer;
    } else {
        window._borderManager.clearAllBorders();
        if (window._borderObserver) {
            window._borderObserver.disconnect();
            delete window._borderObserver;
        }
    }
}
