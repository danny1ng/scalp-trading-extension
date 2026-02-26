(function() {
    'use strict';
    
    console.clear();
    console.log('🚀 Lighter Markers - Universal Search');
    
    let markers = [];
    let overlay;
    let canvasFound = false;
    
    function findCanvasEverywhere() {
        // 1. Проверяем напрямую в документе
        let canvas = document.querySelector('canvas[data-name="pane-top-canvas"]');
        if (canvas) {
            console.log('✅ Canvas found in main document');
            return { canvas, doc: document };
        }
        
        // 2. Ищем во всех iframe
        const iframes = document.querySelectorAll('iframe');
        console.log(`🔍 Checking ${iframes.length} iframes...`);
        
        for (let iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                canvas = iframeDoc.querySelector('canvas[data-name="pane-top-canvas"]');
                
                if (canvas) {
                    console.log('✅ Canvas found in iframe:', iframe.id || iframe.className);
                    return { canvas, doc: iframeDoc, iframe };
                }
            } catch(e) {
                console.log('⚠️ Cannot access iframe (CORS):', e.message);
            }
        }
        
        return null;
    }
    
    function init() {
        const result = findCanvasEverywhere();
        
        if (!result) {
            if (!canvasFound) {
                console.log('⏳ Canvas not ready. Click on the chart to activate it, then run script again.');
                console.log('💡 Or wait and script will retry in 1 second...');
            }
            setTimeout(init, 1000);
            return;
        }
        
        if (canvasFound) return; // Уже инициализировано
        canvasFound = true;
        
        const { canvas, doc } = result;
        console.log('✅ Canvas:', canvas.width + 'x' + canvas.height);
        
        // Overlay в главном документе
        overlay = document.getElementById('markers-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'markers-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999999';
            document.body.appendChild(overlay);
        }
        
        // ЛЕВАЯ КНОПКА = BUY
        canvas.addEventListener('click', function(e) {
            if (!e.altKey) return;
            
            const rect = canvas.getBoundingClientRect();
            
            // Если в iframe, нужно учесть его позицию
            let offsetX = 0, offsetY = 0;
            if (result.iframe) {
                const iframeRect = result.iframe.getBoundingClientRect();
                offsetX = iframeRect.left;
                offsetY = iframeRect.top;
            }
            
            const y = e.clientY - rect.top;
            const price = getPrice(y, rect, doc);
            
            console.log('🟢 BUY at $' + price.toFixed(2));
            addMarker(e.clientX + offsetX, e.clientY + offsetY, price, '#00FF00', 'BUY');
            
            e.stopPropagation();
            e.preventDefault();
        }, true);
        
        // ПРАВАЯ КНОПКА = SELL
        canvas.addEventListener('contextmenu', function(e) {
            if (!e.altKey) return;
            
            const rect = canvas.getBoundingClientRect();
            
            let offsetX = 0, offsetY = 0;
            if (result.iframe) {
                const iframeRect = result.iframe.getBoundingClientRect();
                offsetX = iframeRect.left;
                offsetY = iframeRect.top;
            }
            
            const y = e.clientY - rect.top;
            const price = getPrice(y, rect, doc);
            
            console.log('🔴 SELL at $' + price.toFixed(2));
            addMarker(e.clientX + offsetX, e.clientY + offsetY, price, '#FF0000', 'SELL');
            
            e.stopPropagation();
            e.preventDefault();
            return false;
        }, true);
        
        console.log('✅ READY!');
        console.log('📝 ALT + Left Click = 🟢 BUY');
        console.log('📝 ALT + Right Click = 🔴 SELL');
        console.log('⌨️  Ctrl+C = Clear');
    }
    
    function getPrice(y, canvasRect, searchDoc) {
        const labels = Array.from(searchDoc.querySelectorAll('*'))
            .map(el => {
                const text = el.textContent?.trim();
                if (!text || text.length > 15) return null;
                
                const num = parseFloat(text.replace(/,/g, ''));
                if (isNaN(num) || num < 1000 || num > 200000) return null;
                
                const rect = el.getBoundingClientRect();
                return { price: num, y: rect.top + rect.height / 2 };
            })
            .filter(Boolean)
            .sort((a, b) => a.y - b.y);
        
        if (labels.length < 2) {
            const ratio = y / canvasRect.height;
            return 95000 - (ratio * 10000);
        }
        
        const globalY = canvasRect.top + y;
        
        for (let i = 0; i < labels.length - 1; i++) {
            const upper = labels[i];
            const lower = labels[i + 1];
            
            if (globalY >= upper.y && globalY <= lower.y) {
                const ratio = (globalY - upper.y) / (lower.y - upper.y);
                return upper.price - ratio * (upper.price - lower.price);
            }
        }
        
        const first = labels[0];
        const last = labels[labels.length - 1];
        const pixelRange = last.y - first.y;
        const priceRange = first.price - last.price;
        const pricePerPixel = priceRange / pixelRange;
        
        if (globalY < first.y) {
            return first.price + (first.y - globalY) * pricePerPixel;
        } else {
            return last.price - (globalY - last.y) * pricePerPixel;
        }
    }
    
    function addMarker(x, y, price, color, type) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '28');
        svg.setAttribute('height', '28');
        svg.style.cssText = `
            position:absolute;
            left:${x-14}px;
            top:${y-14}px;
            filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));
            cursor:pointer;
            pointer-events:auto;
        `;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '14');
        circle.setAttribute('cy', '14');
        circle.setAttribute('r', '11');
        circle.setAttribute('fill', color);
        circle.setAttribute('stroke', '#fff');
        circle.setAttribute('stroke-width', '3');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '14');
        text.setAttribute('y', '20');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '18');
        text.setAttribute('font-weight', 'bold');
        text.textContent = '+';
        
        svg.appendChild(circle);
        svg.appendChild(text);
        
        svg.dataset.price = price.toFixed(2);
        svg.dataset.type = type;
        svg.dataset.time = Date.now();
        
        svg.onclick = () => {
            svg.remove();
            markers = markers.filter(m => m !== svg);
            console.log('🗑️ Removed');
        };
        
        overlay.appendChild(svg);
        markers.push(svg);
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'c') {
            if (overlay) overlay.innerHTML = '';
            markers = [];
            console.log('🗑️ Cleared');
        }
    });
    
    window.M = {
        clear: () => { 
            if (overlay) overlay.innerHTML = ''; 
            markers = []; 
        },
        list: () => {
            console.table(markers.map(m => ({
                type: m.dataset.type,
                price: '$' + m.dataset.price
            })));
        },
        reload: init // Перезапустить поиск canvas
    };
    
    init();
})();