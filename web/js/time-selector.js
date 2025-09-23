/**
 * 負責處理時間選擇器（datetime-local input）的顯示與互動。
 * 當使用者點擊 #time-display 元素時，動態創建並定位一個時間選擇器。
 */
function initializeTimeSelector() {
    const timeDisplay = document.getElementById('time-display');
    if (!timeDisplay) {
        console.warn('Element with id "time-display" not found for time selector initialization.');
        return;
    }

    timeDisplay.addEventListener('click', function() {
        // 如果 time-selector 元素已存在於 DOM 中，則聚焦它並返回，避免重複創建
        const existingSelector = document.getElementById('time-selector');
        if (existingSelector) {
            existingSelector.focus();
            return;
        }

        const timeSelector = document.createElement('input');
        timeSelector.type = 'datetime-local';
        timeSelector.id = 'time-selector';

        timeSelector.addEventListener('blur', function() {
            // 使用 setTimeout 確保在點擊其他地方後能正確移除
            setTimeout(() => {
                if (this && this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            }, 200);
        });

        // 若 time-display 有值，帶入 timeSelector
        if (timeDisplay.textContent) {
            const match = timeDisplay.textContent.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
            if (match) {
                const val = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
                timeSelector.value = val;
            }
        }

        // 取得 time-display 的座標，將 time-selector 貼齊右側
        const rect = timeDisplay.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        timeSelector.style.left = (rect.right + scrollLeft + 8) + 'px';
        timeSelector.style.top = (rect.top + scrollTop) + 'px';

        document.body.appendChild(timeSelector);
        timeSelector.focus();
    });
}

// 確保 DOM 載入完成後再執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTimeSelector);
} else {
    initializeTimeSelector();
}