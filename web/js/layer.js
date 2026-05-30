class LayerMenu {
    constructor() {
        this.activeLayers = new Set(['radar']);
        this.init();
    }

    init() {
        this.createMenuStructure();
        this.createCurrentLayerDisplay();
        this.setupEventListeners();
        this.loadActiveLayer();
    }

    createMenuStructure() {
        const menu = document.createElement('div');
        menu.className = 'layer-menu';
        menu.innerHTML = `
            <ul class="layer-list">
                <li class="layer-item active" data-layer="radar">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed">
                        <path d="M480.28-96Q401-96 331-126t-122.5-82.5Q156-261 126-330.96t-30-149.5Q96-560 126-629.5q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5T834-629.28q30 69.73 30 149Q864-401 834-331t-82.5 122.5Q699-156 629.28-126q-69.73 30-149 30Zm.06-72Q535-168 584-186t89-50l-51-52q-29.63 22.91-65.89 35.45Q519.84-240 480-240q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 40-12.5 76T672-338l52 51q32-40.13 50-89.06 18-48.94 18-103.6 0-130.79-91-221.57Q610-792 480-792t-221 91q-91 91-91 221t90.77 221q90.78 91 221.57 91ZM480-312q25 0 47.5-7t42.5-20l-72-72q-4.5 2-9 2.5t-9 .5q-29.7 0-50.85-21.21Q408-450.43 408-480q0-29.7 21.21-50.85 21.21-21.15 51-21.15T531-530.96q21 21.04 21 50.59 0 5.37-1 9.37-1 4-2 9l72 72q12.91-19.76 19.96-42.26Q648-454.76 648-480q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Z"/>
                    </svg>
                    雷達回波
                </li>
                <li class="layer-item" data-layer="radarRain">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e8eaed">
                        <path d="M480.28-96Q401-96 331-126t-122.5-82.5Q156-261 126-330.96t-30-149.5Q96-560 126-629.5q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5T834-629.28q30 69.73 30 149Q864-401 834-331t-82.5 122.5Q699-156 629.28-126q-69.73 30-149 30Zm.06-72Q535-168 584-186t89-50l-51-52q-29.63 22.91-65.89 35.45Q519.84-240 480-240q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 40-12.5 76T672-338l52 51q32-40.13 50-89.06 18-48.94 18-103.6 0-130.79-91-221.57Q610-792 480-792t-221 91q-91 91-91 221t90.77 221q90.78 91 221.57 91ZM480-312q25 0 47.5-7t42.5-20l-72-72q-4.5 2-9 2.5t-9 .5q-29.7 0-50.85-21.21Q408-450.43 408-480q0-29.7 21.21-50.85 21.21-21.15 51-21.15T531-530.96q21 21.04 21 50.59 0 5.37-1 9.37-1 4-2 9l72 72q12.91-19.76 19.96-42.26Q648-454.76 648-480q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Z"/>
                    </svg>
                    降雨雷達
                </li>
                <li class="layer-item" data-layer="rain">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="M338-204q-15 8-30.5 2.5T284-222L44-702q-8-15-2.5-30.5T62-756q15-8 30.5-2.5T116-738l240 480q8 15 2.5 30.5T338-204Zm187 0q-15 8-30.5 2.5T471-222L231-702q-8-15-2.5-30.5T249-756q15-8 30-2.5t23 20.5l241 480q8 15 2.5 30.5T525-204Zm187-1q-15 8-30.5 3T658-222L418-702q-8-15-2.5-30.5T436-756q15-8 30-2.5t23 20.5l241 480q8 15 2.5 30T712-205Zm186 1q-15 8-30.5 2.5T844-222L604-702q-8-15-2.5-30.5T622-756q15-8 30.5-2.5T676-738l240 480q8 15 2.5 30.5T898-204Z"/>
                    </svg>
                    雨量
                </li>
                <div class="time-interval-container">
                    <select id="interval-selector">
                        <option value="now" selected>現在</option>
                        <option value="10m">10 分鐘</option>
                        <option value="1h">1 小時</option>
                        <option value="3h">3 小時</option>
                        <option value="6h">6 小時</option>
                        <option value="12h">12 小時</option>
                        <option value="24h">24 小時</option>
                        <option value="2d">2 天</option>
                        <option value="3d">3 天</option>
                    </select>
                </div>
                <li class="layer-item layer-group parent" data-layer="temperature">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="M480-120q-83 0-141.5-58.5T280-320q0-48 21-89.5t59-70.5v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q38 29 59 70.5t21 89.5q0 83-58.5 141.5T480-120Zm0-80q50 0 85-35t35-85q0-29-12.5-54T552-416l-32-24v-280q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720v280l-32 24q-23 17-35.5 42T360-320q0 50 35 85t85 35Zm0-120Z"/>
                    </svg>
                    氣溫
                    <svg class="group-arrow" xmlns="http://www.w3.org/2000/svg" height="14px" width="14px" viewBox="0 0 24 24" fill="#aaa">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </li>
                <ul class="layer-group-children" data-parent="temperature">
                    <li class="layer-item" data-layer="tempHigh">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
                            <path d="M480-120q-83 0-141.5-58.5T280-320q0-48 21-89.5t59-70.5v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q38 29 59 70.5t21 89.5q0 83-58.5 141.5T480-120Zm0-80q50 0 85-35t35-85q0-29-12.5-54T552-416l-32-24v-280q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720v280l-32 24q-23 17-35.5 42T360-320q0 50 35 85t85 35Zm0-120Z"/>
                        </svg>
                        最高氣溫
                    </li>
                    <li class="layer-item" data-layer="tempLow">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
                            <path d="M480-120q-83 0-141.5-58.5T280-320q0-48 21-89.5t59-70.5v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q38 29 59 70.5t21 89.5q0 83-58.5 141.5T480-120Zm0-80q50 0 85-35t35-85q0-29-12.5-54T552-416l-32-24v-280q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720v280l-32 24q-23 17-35.5 42T360-320q0 50 35 85t85 35Zm0-120Z"/>
                        </svg>
                        最低氣溫
                    </li>
                    <li class="layer-item" data-layer="tempDiffHigh">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
                            <path d="M480-120q-83 0-141.5-58.5T280-320q0-48 21-89.5t59-70.5v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q38 29 59 70.5t21 89.5q0 83-58.5 141.5T480-120Zm0-80q50 0 85-35t35-85q0-29-12.5-54T552-416l-32-24v-280q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720v280l-32 24q-23 17-35.5 42T360-320q0 50 35 85t85 35Zm0-120Z"/>
                        </svg>
                        (高/低)溫差
                    </li>
                </ul>
                <li class="layer-item" data-layer="humidity">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="M580-240q25 0 42.5-17.5T640-300q0-25-17.5-42.5T580-360q-25 0-42.5 17.5T520-300q0 25 17.5 42.5T580-240Zm-202-2 260-260-56-56-260 260 56 56Zm2-198q25 0 42.5-17.5T440-500q0-25-17.5-42.5T380-560q-25 0-42.5 17.5T320-500q0 25 17.5 42.5T380-440ZM480-80q-137 0-228.5-94T160-408q0-100 79.5-217.5T480-880q161 137 240.5 254.5T800-408q0 140-91.5 234T480-80Zm0-80q104 0 172-70.5T720-408q0-73-60.5-165T480-774Q361-665 300.5-573T240-408q0 107 68 177.5T480-160Zm0-320Z"/>
                    </svg>
                    濕度
                </li>
                <li class="layer-item" data-layer="pressure">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="M80-600v-120q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v220h-80v-220H160v120H80Zm200 320q-11 0-21-5.5T244-302l-69-138H80v-80h120q11 0 21 5.5t15 16.5l44 88 124-248q5-10 15-15t21-5q11 0 21 5t15 15l67 134q-18 11-34.5 23T478-474l-38-76-124 248q-5 11-15 16.5t-21 5.5Zm147 120H160q-33 0-56.5-23.5T80-240v-120h80v120h243q3 21 9 41t15 39Zm53-320ZM680-80q-83 0-141.5-58.5T480-280q0-83 58.5-141.5T680-480q83 0 141.5 58.5T880-280q0 83-58.5 141.5T680-80Zm8-180 91-91-28-28-91 91 28 28Z"/>
                    </svg>
                    氣壓
                </li>
                <li class="layer-item" data-layer="wind">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="M400-40q0-33 23.5-56.5T480-120v-208q-12-5-22.5-11.5T438-354l-88 56q-14 8-30.5 10.5T286-290l-180-51q-29-8-47.5-32.5T40-429q0-38 26.5-64.5T131-520h301q10-11 22-19t26-13v-137q0-17 6.5-32t18.5-26l137-128q23-22 53.5-25t56.5 13q32 20 41.5 56.5T783-762L624-499q7 12 10.5 26t4.5 29l108 26q16 4 29 14t21 24l91 164q15 27 11 57t-26 52q-27 27-64.5 27T744-107L560-291v171q33 0 56.5 23.5T640-40H400ZM160-760v-80h240v80H160Zm400 71v137q1 0 1.5.5t1.5.5l152-253q2-4 1-8.5t-5-6.5q-3-2-7.5-1t-6.5 3L560-689ZM40-600v-80h200v80H40Zm480 200q17 0 28.5-11.5T560-440q0-17-11.5-28.5T520-480q-17 0-28.5 11.5T480-440q0 17 11.5 28.5T520-400Zm-211 34 93-56q-1-5-1-9v-9H131q-5 0-8 3t-3 8q0 4 2 7t6 4l181 52Zm419 25-114-26q-2 2-4 5t-4 5l195 194q3 3 8 3t8-3q3-3 3.5-6.5T819-177l-91-164ZM120-120v-80h200v80H120Zm400-320Zm43-111ZM401-440Zm205 83Z"/>
                    </svg>
                    風向/風速
                </li>
                <li class="layer-item" data-layer="lightning">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z"/>
                    </svg>
                    閃電
                </li>
                <li class="layer-item" data-layer="rainfall">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                        <path d="M120-240h400l-60-80H120q-33 0-56.5-23.5T40-480q0-33 23.5-56.5T120-560q17 0 33 6l243-170q-25-22-42-52t-25-65H40q-33 0-56.5-23.5T-40-840v-40q0-33 23.5-56.5T40-960h200q16 0 31 6t28 17l160 137q12 10 30 10t30-10l160-137q13-11 28-17t31-6h200q33 0 56.5 23.5T840-880q0 33-23.5 56.5T760-800h-141q-8 35-25 65t-42 52l243 170q16-6 33-6 33 0 56.5 23.5T880-480q0 33-23.5 56.5T800-400H440l60 80-60 80h400l60 80-60 80H120l-60-80 60-80Zm237 0 123-240H357Z"/>
                    </svg>
                    雨量預測
                </li>
                <div class="rainfall-city-container" style="display:none; padding: 0 10px 10px;">
                    <span style="color:#aaa;font-size:12px;margin-bottom:4px;display:block;">縣市：</span>
                    <select id="rainfall-city-dropdown" onchange="if(window.rainfallLayer) window.rainfallLayer.updateTime(this.value)" style="background:#2c2d32;color:#e0e0e0;border:1px solid #555;border-radius:4px;padding:4px 10px;font-size:0.9rem;cursor:pointer;width:100%;">
                        <option value="" selected>全部縣市</option>
                        <option value="臺北市">臺北市</option>
                        <option value="新北市">新北市</option>
                        <option value="桃園市">桃園市</option>
                        <option value="臺中市">臺中市</option>
                        <option value="臺南市">臺南市</option>
                        <option value="高雄市">高雄市</option>
                        <option value="基隆市">基隆市</option>
                        <option value="新竹市">新竹市</option>
                        <option value="新竹縣">新竹縣</option>
                        <option value="宜蘭縣">宜蘭縣</option>
                        <option value="苗栗縣">苗栗縣</option>
                        <option value="彰化縣">彰化縣</option>
                        <option value="南投縣">南投縣</option>
                        <option value="雲林縣">雲林縣</option>
                        <option value="嘉義縣">嘉義縣</option>
                        <option value="嘉義市">嘉義市</option>
                        <option value="屏東縣">屏東縣</option>
                        <option value="花蓮縣">花蓮縣</option>
                        <option value="臺東縣">臺東縣</option>
                        <option value="澎湖縣">澎湖縣</option>
                        <option value="金門縣">金門縣</option>
                        <option value="連江縣">連江縣</option>
                        <option value="大安區">大安區</option>
                        <option value="士林區">士林區</option>
                        <option value="內湖區">內湖區</option>
                        <option value="中正區">中正區</option>
                        <option value="信義區">信義區</option>
                        <option value="萬華區">萬華區</option>
                        <option value="北投區">北投區</option>
                        <option value="松山區">松山區</option>
                        <option value="中山區">中山區</option>
                        <option value="文山區">文山區</option>
                        <option value="南港區">南港區</option></select>
                </div>
            </ul>
        `;
        document.body.appendChild(menu);
    }

    createCurrentLayerDisplay() {
        const display = document.createElement('div');
        display.className = 'current-layer-display';
        document.body.appendChild(display);
        this.updateCurrentLayerDisplay();

        display.addEventListener('click', () => {
            this.minimizeLegends();
            display.classList.toggle('active');
            const menu = document.querySelector('.layer-menu');
            if (display.classList.contains('active')) {
                const displayRect = display.getBoundingClientRect();
                menu.style.top = `${displayRect.bottom + 5}px`;
                menu.style.left = '10px';
                menu.style.right = 'auto';
            }
            menu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!display.contains(e.target) && !document.querySelector('.layer-menu').contains(e.target)) {
                display.classList.remove('active');
                document.querySelector('.layer-menu').classList.remove('active');
            }
        });
    }

    updateCurrentLayerDisplay() {
        const display = document.querySelector('.current-layer-display');
        if (display) {
            if (this.activeLayers.size > 1) {
                display.innerHTML = '';
                const text = '多圖層';
                display.appendChild(document.createTextNode(text));
            } else if (this.activeLayers.size === 1) {
                const layer = this.activeLayers.values().next().value;
                const layerItem = document.querySelector(`[data-layer="${layer}"]`);
                if (layerItem) {
                    const icon = layerItem.querySelector('svg').cloneNode(true);
                    var text = '';
                    layerItem.childNodes.forEach(function (node) {
                        if (node.nodeType === 3 && node.textContent.trim()) {
                            text += node.textContent.trim();
                        }
                    });
                    display.innerHTML = '';
                    display.appendChild(icon);
                    display.appendChild(document.createTextNode(text));
                }
            } else {
                display.innerHTML = '未選擇圖層';
            }
        }
    }

    setupEventListeners() {
        const menu = document.querySelector('.layer-menu');
        const layerItems = document.querySelectorAll('.layer-item');
        const display = document.querySelector('.current-layer-display');

        layerItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Stop propagation if clicking on a parent item's arrow
                if (e.target.classList.contains('group-arrow')) {
                    e.stopPropagation();
                }

                const layer = item.dataset.layer;
                const exclusiveGroups = [
                    ['radar', 'radarRain'],
                    ['temperature', 'tempHigh', 'tempLow', 'tempDiffHigh'],
                ];

                // Check if this is a child item of a group
                const parentGroup = item.closest('.layer-group.parent');
                const isParentItem = parentGroup && item.classList.contains('parent');
                const groupLayer = parentGroup ? parentGroup.dataset.layer : null;

                if (isParentItem) {
                    // Toggle active state of children elements for visual expand/collapse
                    const childItems = parentGroup.querySelectorAll('.layer-item');
                    const anyChildActive = Array.from(childItems).some(el => el.classList.contains('active'));

                    if (anyChildActive) {
                        // Collapse: remove active from all children, remove active from parent
                        childItems.forEach(el => el.classList.remove('active'));
                        item.classList.remove('active');
                    } else {
                        // Expand: add active to all children, add active to parent
                        childItems.forEach(el => el.classList.add('active'));
                        item.classList.add('active');
                    }
                    // Don't call updateLayers() — parent click only toggles visual, not layer activation
                    return;
                } else if (item.classList.contains('child')) {
                    // Child item clicked
                    if (this.activeLayers.has(layer)) {
                        this.activeLayers.delete(layer);
                        item.classList.remove('active');
                    } else {
                        this.activeLayers.add(layer);
                        item.classList.add('active');
                    }

                    // Update parent state
                    if (parentGroup) {
                        const childLayers = parentGroup.dataset.children
                            ? JSON.parse(parentGroup.dataset.children)
                            : groupLayer
                                ? (exclusiveGroups.find(g => g.includes(groupLayer)) || []).filter(l => l !== groupLayer)
                                : [];

                        const someActive = childLayers.some(l => this.activeLayers.has(l));
                        if (someActive) {
                            parentGroup.classList.add('active');
                        } else {
                            parentGroup.classList.remove('active');
                        }
                    }
                    this.updateLayers();
                } else {
                    // Regular item (not parent, not child)
                    if (this.activeLayers.has(layer)) {
                        this.activeLayers.delete(layer);
                        item.classList.remove('active');
                    } else {
                        this.activeLayers.add(layer);
                        item.classList.add('active');

                        const group = exclusiveGroups.find(g => g.includes(layer));
                        if (group) {
                            group.forEach(layerInGroup => {
                                if (layerInGroup !== layer && this.activeLayers.has(layerInGroup)) {
                                    this.activeLayers.delete(layerInGroup);
                                    const itemToDeactivate = document.querySelector(`[data-layer="${layerInGroup}"]`);
                                    if (itemToDeactivate) {
                                        itemToDeactivate.classList.remove('active');
                                    }
                                }
                            });
                        }
                    }
                    this.updateLayers();
                }
            });
        });
    }

    updateLayers() {
        const layers = {
            temperature: window.temperatureLayer,
            tempHigh: window.temperatureHighLayer,
            tempLow: window.temperatureLowLayer,
            tempDiffHigh: window.temperatureDiffHighLayer,
            radar: window.radarLayer,
            radarRain: window.radarRainLayer,
            rain: window.rainLayer,
            rainfall: window.rainfallLayer,
            humidity: window.humidityLayer,
            pressure: window.pressureLayer,
            wind: window.windLayer,
            lightning: window.lightningLayer
        };

        Object.keys(layers).forEach(layerKey => {
            const layer = layers[layerKey];
            if (layer) {
                if (this.activeLayers.has(layerKey)) {
                    layer.show();
                    layer.updateTime();
                } else {
                    layer.hide();
                }
            }
        });

        // 顯示/隱藏播放功能
        const playBtn = document.getElementById('radar-play-btn');
        const speedSel = document.getElementById('radar-speed-sel');
        const rangeSel = document.getElementById('radar-range-sel');
        if (playBtn) playBtn.style.display = this.activeLayers.has('radar') ? '' : 'none';
        if (speedSel) speedSel.style.display = this.activeLayers.has('radar') ? '' : 'none';
        if (rangeSel) rangeSel.style.display = this.activeLayers.has('radar') ? '' : 'none';

        const radarRainControls = document.getElementById('radar-rain-controls');
        if (radarRainControls) radarRainControls.style.display = this.activeLayers.has('radarRain') ? 'flex' : 'none';

        const intervalContainer = document.querySelector('.time-interval-container');
        if (intervalContainer) {
            intervalContainer.style.display = this.activeLayers.has('rain') ? 'block' : 'none';
        }

        const rainfallCityContainer = document.querySelector('.rainfall-city-container');
        if (rainfallCityContainer) {
            rainfallCityContainer.style.display = this.activeLayers.has('rainfall') ? 'block' : 'none';
        }

        this.updateCurrentLayerDisplay();

        if (chartTypeSelect) {
            if (rainIntervalSelect) {
                if (this.activeLayers.has('rain') || this.activeLayers.has('all')) {
                    rainIntervalSelect.style.display = 'block';
                } else {
                    rainIntervalSelect.style.display = 'none';
                }
            }
        }
    }

    loadActiveLayer() {
        this.updateLayers();
    }

    minimizeLegends() {
        const containers = document.querySelectorAll('.legend-container');
        containers.forEach(container => {
            const header = container.querySelector('.legend-header');
            const content = header ? header.nextElementSibling : null;
            const icon = header ? header.querySelector('.legend-toggle-icon') : null;
            if (content && content.style.display !== 'none') {
                content.style.display = 'none';
                if (icon) icon.textContent = '▲';
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.layerMenu = new LayerMenu();

    // 監聽 timeSelector 和 interval-selector 變更
    document.addEventListener('change', function (e) {
        if (e.target && (e.target.id === 'time-selector' || e.target.id === 'interval-selector')) {
            let timeStr;
            // If time-selector triggered the change, use its value
            if (e.target.id === 'time-selector') {
                timeStr = e.target.value.replace('T', ' ');
            } else {
                // Otherwise (interval-selector changed), use the time from time-display
                const timeDisplay = document.getElementById('time-display');
                if (timeDisplay && timeDisplay.textContent) {
                    timeStr = timeDisplay.textContent;
                } else {
                    // Fallback to current time if time-display is not available
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    timeStr = now.toISOString().slice(0, 16).replace('T', ' ');
                }
            }

            if (!timeStr) return;

            const activeLayers = window.layerMenu && window.layerMenu.activeLayers;
            if (!activeLayers) return;

            let interval = 'now';
            const intervalSelector = document.getElementById('interval-selector');
            if (intervalSelector) {
                interval = intervalSelector.value;
            }

            const layerMap = {
                radar: window.radarLayer,
                radarRain: window.radarRainLayer,
                rain: {
                    updateTime: (time) => window.rainLayer.updateTime(interval, time)
                },
                rainfall: window.rainfallLayer,
                temperature: window.temperatureLayer,
                tempHigh: window.temperatureHighLayer,
                tempLow: window.temperatureLowLayer,
                tempDiffHigh: window.temperatureDiffHighLayer,
                humidity: window.humidityLayer,
                pressure: window.pressureLayer,
                wind: window.windLayer,
                lightning: window.lightningLayer
            };

            activeLayers.forEach(activeLayer => {
                const layerObj = layerMap[activeLayer];
                if (layerObj && typeof layerObj.updateTime === 'function') {
                    layerObj.updateTime(timeStr);
                }
            });
        }
    });
});
