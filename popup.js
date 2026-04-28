/**
 * WebCraft 网页工坊 - Popup Script
 * 网页采集、截图、翻译和 YouTube 辅助的弹窗逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  const openOptionsBtn = document.getElementById('openOptions');
  openOptionsBtn?.addEventListener('click', () => {
    const fallbackUrl = chrome.runtime.getURL('options.html');
    try {
      chrome.runtime.openOptionsPage(() => {
        if (chrome.runtime.lastError) {
          chrome.tabs.create({ url: fallbackUrl });
        }
      });
    } catch (error) {
      chrome.tabs.create({ url: fallbackUrl });
    }
  });

  // ========== 标签页切换 ==========
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // 更新按钮状态
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新内容显示
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
        }
      });

      // 保存当前标签
      chrome.storage.local.set({ activeTab: targetTab });
    });
  });

  // ========== 截图功能 ==========
  const nameInput = document.getElementById('customName');
  const screenshotStatus = document.getElementById('screenshotStatus');
  const btnVisible = document.getElementById('btnCaptureVisible');
  const btnFull = document.getElementById('btnCaptureFull');
  const btnStartRecording = document.getElementById('btnStartRecording');

  // 自定义工具相关元素
  const customToolsContainer = document.getElementById('customToolsContainer');
  const addCustomToolBtn = document.getElementById('addCustomTool');
  const customToolPanel = document.getElementById('customToolPanel');
  const customToolInput = document.getElementById('customToolInput');
  const confirmCustomToolBtn = document.getElementById('confirmCustomTool');
  const cancelCustomToolBtn = document.getElementById('cancelCustomTool');

  // 渲染自定义工具选项
  function renderCustomTools(customTools, selectedTool) {
    customToolsContainer.innerHTML = '';
    customTools.forEach((toolName, index) => {
      const label = document.createElement('label');
      label.className = 'radio-item custom-item';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'tool';
      radio.value = toolName;
      radio.checked = selectedTool === toolName;

      const text = document.createTextNode(` ${toolName} `);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.dataset.index = String(index);
      deleteBtn.title = '删除此选项';
      deleteBtn.textContent = '✕';

      label.appendChild(radio);
      label.appendChild(text);
      label.appendChild(deleteBtn);
      customToolsContainer.appendChild(label);
    });

    // 为新添加的自定义工具绑定事件
    customToolsContainer.querySelectorAll('input[name="tool"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        chrome.storage.local.set({ tool: e.target.value });
      });
    });

    // 绑定删除按钮事件
    customToolsContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        deleteCustomTool(index);
      });
    });
  }

  // 删除自定义工具
  function deleteCustomTool(index) {
    chrome.storage.local.get(['customTools', 'tool'], (result) => {
      const customTools = result.customTools || [];
      const deletedTool = customTools[index];
      customTools.splice(index, 1);

      chrome.storage.local.set({ customTools }, () => {
        // 如果删除的是当前选中的工具，切换到默认
        if (result.tool === deletedTool) {
          const defaultRadio = document.querySelector('input[name="tool"][value="Midjourney生成"]');
          if (defaultRadio) {
            defaultRadio.checked = true;
            chrome.storage.local.set({ tool: 'Midjourney生成' });
          }
        }
        renderCustomTools(customTools, result.tool === deletedTool ? 'Midjourney生成' : result.tool);
      });
    });
  }

  // 显示添加面板
  addCustomToolBtn.addEventListener('click', () => {
    customToolPanel.style.display = 'block';
    customToolInput.value = '';
    customToolInput.focus();
  });

  // 取消添加
  cancelCustomToolBtn.addEventListener('click', () => {
    customToolPanel.style.display = 'none';
    customToolInput.value = '';
  });

  // 确认添加自定义工具
  confirmCustomToolBtn.addEventListener('click', () => {
    const newToolName = customToolInput.value.trim();
    if (!newToolName) {
      customToolInput.focus();
      return;
    }

    chrome.storage.local.get(['customTools'], (result) => {
      const customTools = result.customTools || [];

      // 检查是否已存在
      const allTools = ['Midjourney生成', 'Firefly生成', '购买Gemini生成', 'Flow Ultra版', 'Flow Pro版', ...customTools];
      if (allTools.includes(newToolName)) {
        alert('该工具名称已存在！');
        return;
      }

      customTools.push(newToolName);
      chrome.storage.local.set({ customTools, tool: newToolName }, () => {
        renderCustomTools(customTools, newToolName);
        customToolPanel.style.display = 'none';
        customToolInput.value = '';
      });
    });
  });

  // 回车确认添加
  customToolInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmCustomToolBtn.click();
    } else if (e.key === 'Escape') {
      cancelCustomToolBtn.click();
    }
  });

  // 加载截图设置
  chrome.storage.local.get(['customName', 'format', 'tool', 'activeTab', 'customTools'], (result) => {
    if (result.customName) {
      nameInput.value = result.customName;
    }
    if (result.format) {
      const formatRadio = document.querySelector(`input[name="format"][value="${result.format}"]`);
      if (formatRadio) formatRadio.checked = true;
    }

    // 加载自定义工具
    const customTools = result.customTools || [];
    renderCustomTools(customTools, result.tool);

    if (result.tool) {
      const toolRadio = document.querySelector(`input[name="tool"][value="${result.tool}"]`);
      if (toolRadio) toolRadio.checked = true;
    }
    // 恢复上次的标签
    if (result.activeTab) {
      const btn = document.querySelector(`.tab-btn[data-tab="${result.activeTab}"]`);
      if (btn) btn.click();
    }
  });

  // 保存名称
  nameInput.addEventListener('input', () => {
    chrome.storage.local.set({ customName: nameInput.value });
  });

  // 保存生成工具选择
  document.querySelectorAll('input[name="tool"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      chrome.storage.local.set({ tool: e.target.value });
    });
  });

  // 保存格式选择
  document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      chrome.storage.local.set({ format: e.target.value });
    });
  });

  function getFormat() {
    const checked = document.querySelector('input[name="format"]:checked');
    return checked ? checked.value : 'jpg';
  }

  function getName() {
    return nameInput.value.trim() || '未命名';
  }

  function getTool() {
    const checked = document.querySelector('input[name="tool"]:checked');
    return checked ? checked.value : 'Midjourney生成';
  }

  function showScreenshotStatus(text, type = '') {
    screenshotStatus.textContent = text;
    screenshotStatus.className = `status-message ${type}`;
    setTimeout(() => {
      screenshotStatus.textContent = '';
      screenshotStatus.className = 'status-message';
    }, 3000);
  }

  chrome.storage.local.get(['screenshotModuleEnabled', 'recordingModuleEnabled', 'youtubeToolsEnabled'], (result) => {
    const screenshotEnabled = result.screenshotModuleEnabled !== false;
    const recordingEnabled = result.recordingModuleEnabled !== false;
    const youtubeEnabled = result.youtubeToolsEnabled !== false;

    btnVisible.disabled = !screenshotEnabled;
    btnFull.disabled = !screenshotEnabled;
    btnVisible.title = screenshotEnabled ? '' : '截图模块已在设置页关闭';
    btnFull.title = screenshotEnabled ? '' : '截图模块已在设置页关闭';

    btnStartRecording.disabled = !recordingEnabled;
    btnStartRecording.title = recordingEnabled ? '' : '录屏模块已在设置页关闭';

    btnDownloadThumbnail.disabled = !youtubeEnabled;
    btnBatchDownload.disabled = !youtubeEnabled;
    btnDownloadThumbnail.title = youtubeEnabled ? '' : 'YouTube 工具已在设置页关闭';
    btnBatchDownload.title = youtubeEnabled ? '' : 'YouTube 工具已在设置页关闭';
  });

  btnVisible.addEventListener('click', () => {
    if (btnVisible.disabled) return;
    const format = getFormat();
    const name = getName();
    const tool = getTool();
    showScreenshotStatus('正在截图...');

    chrome.runtime.sendMessage({
      action: 'captureVisible',
      payload: { name, format, tool }
    });
  });

  // 手动模式复选框
  const manualCaptureCheckbox = document.getElementById('manualCaptureMode');

  // 加载手动模式设置
  chrome.storage.local.get(['manualCaptureMode'], (result) => {
    if (result.manualCaptureMode) {
      manualCaptureCheckbox.checked = true;
    }
  });

  // 保存手动模式设置
  manualCaptureCheckbox.addEventListener('change', (e) => {
    chrome.storage.local.set({ manualCaptureMode: e.target.checked });
  });

  btnFull.addEventListener('click', () => {
    if (btnFull.disabled) return;
    const format = getFormat();
    const name = getName();
    const tool = getTool();
    const manualMode = manualCaptureCheckbox.checked;

    showScreenshotStatus(manualMode ? '准备从当前位置截图...' : '正在准备长截图...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'startFullCapture',
          payload: {
            name,
            format,
            tool,
            manualMode: manualMode,
            startFromCurrent: manualMode
          }
        }, () => {
          // 消息发送完成后关闭 popup 窗口
          // 使用延迟确保消息已被接收
          setTimeout(() => {
            window.close();
          }, 100);
        });
      }
    });
  });

  // ========== 录制功能 ==========
  btnStartRecording.addEventListener('click', () => {
    if (btnStartRecording.disabled) return;
    const name = getName();
    const tool = getTool();
    showScreenshotStatus('正在启动录制...');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'startRegionSelector',
          payload: { name, tool }
        }, () => {
          // 关闭 popup，让用户在页面上选择区域
          setTimeout(() => {
            window.close();
          }, 100);
        });
      }
    });
  });

  // ========== 翻译功能 ==========
  const footerText = document.getElementById('footerText');
  const translateEngineRadios = document.querySelectorAll('input[name="translateEngine"]');
  const deeplEngineDesc = document.getElementById('deeplEngineDesc');
  const hideYoutubeTranslateCheckbox = document.getElementById('hideYoutubeTranslate');
  const translateEnabledCheckbox = document.getElementById('translateEnabled');
  const translateShortcutSelect = document.getElementById('translateShortcut');
  const translateTargetLangSelect = document.getElementById('translateTargetLang');

  chrome.storage.local.remove(['geminiApiKey', 'translateMode']);

  chrome.storage.local.get(['translateEngine', 'deeplApiKey'], (result) => {
    updateTranslateEngineSelection(result.translateEngine || 'google', !!result.deeplApiKey);
  });

  // 加载隐藏 YouTube 翻译按钮设置
  chrome.storage.local.get(['hideYoutubeTranslate', 'translateEnabled', 'translateShortcut', 'translateTargetLang'], (result) => {
    if (result.hideYoutubeTranslate) {
      hideYoutubeTranslateCheckbox.checked = true;
    }
    // 默认为开启
    if (result.translateEnabled !== false) {
      translateEnabledCheckbox.checked = true;
    } else {
      translateEnabledCheckbox.checked = false;
    }
    // 快捷键
    if (result.translateShortcut) {
      translateShortcutSelect.value = result.translateShortcut;
    }
    if (result.translateTargetLang) {
      translateTargetLangSelect.value = result.translateTargetLang;
    }
  });

  // 保存隐藏 YouTube 翻译按钮设置
  hideYoutubeTranslateCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    chrome.storage.local.set({ hideYoutubeTranslate: isChecked }, () => {
      // 通知当前活动的 YouTube 标签页更新设置
      chrome.tabs.query({ url: '*://www.youtube.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateHideYoutubeTranslate',
            payload: { hide: isChecked }
          }).catch(() => { });
        });
      });
    });
  });

  // 保存翻译开启状态
  translateEnabledCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    chrome.storage.local.set({ translateEnabled: isChecked }, () => {
      // 通知所有标签页
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateTranslateSettings',
            payload: { enabled: isChecked }
          }).catch(() => { });
        });
      });

      updateStatusCard(isChecked);
    });
  });

  // 保存快捷键设置
  translateShortcutSelect.addEventListener('change', (e) => {
    const shortcut = e.target.value;
    chrome.storage.local.set({ translateShortcut: shortcut }, () => {
      // 通知所有标签页
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateTranslateSettings',
            payload: { shortcut: shortcut }
          }).catch(() => { });
        });
      });
    });
  });

  function updateStatusCard(isEnabled) {
    const statusText = document.querySelector('.status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    if (isEnabled) {
      statusText.textContent = '翻译功能已启用';
      statusIndicator.classList.add('active');
      statusIndicator.style.background = '#4CAF50';
    } else {
      statusText.textContent = '翻译功能已关闭';
      statusIndicator.classList.remove('active');
      statusIndicator.style.background = '#ccc';
    }
  }

  updateFooter();

  translateEngineRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const engine = event.target.value;
      chrome.storage.local.set({ translateEngine: engine }, () => {
        updateTranslateEngineSelection(engine, null);
        notifyTranslateTabs({ engine });
        updateFooter();
      });
    });
  });

  translateTargetLangSelect.addEventListener('change', (e) => {
    const targetLang = e.target.value;
    chrome.storage.local.set({ translateTargetLang: targetLang }, () => {
      notifyTranslateTabs({ targetLang });
    });
  });

  function updateTranslateEngineSelection(engine, hasDeepLKey) {
    translateEngineRadios.forEach(radio => {
      radio.checked = radio.value === engine;
    });
    if (hasDeepLKey !== null) {
      deeplEngineDesc.textContent = hasDeepLKey
        ? '质量优先，失败回落 Google'
        : '请到设置页填写 API Key';
    }
  }

  function notifyTranslateTabs(payload) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateTranslateSettings',
          payload
        }, () => void chrome.runtime.lastError);
      });
    });
  }

  function updateFooter() {
    const translateTab = document.querySelector('.tab-btn[data-tab="translate"]');
    if (translateTab.classList.contains('active')) {
      chrome.storage.local.get(['translateEngine'], (result) => {
        footerText.textContent = result.translateEngine === 'deepl'
          ? 'Powered by DeepL API'
          : 'Powered by Google Translate';
      });
    }
  }

  // 更新页脚信息
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'screenshot') {
        footerText.textContent = '快捷键: Ctrl+Shift+S 截图';
      } else if (btn.dataset.tab === 'youtube') {
        footerText.textContent = 'YouTube 缩略图下载';
      } else {
        updateFooter();
      }
    });
  });

  // ========== YouTube 功能 ==========
  const youtubeUrlInput = document.getElementById('youtubeUrl');
  const btnDownloadThumbnail = document.getElementById('btnDownloadThumbnail');
  const youtubeStatus = document.getElementById('youtubeStatus');

  const playlistUrlInput = document.getElementById('playlistUrl');
  const btnBatchDownload = document.getElementById('btnBatchDownload');
  const recommendationModeRadios = document.querySelectorAll('input[name="recommendationsMode"]');
  const recommendationsWhitelistGroup = document.getElementById('recommendationsWhitelistGroup');
  const recommendationsWhitelistInput = document.getElementById('recommendationsWhitelist');

  function updateRecommendationsWhitelistVisibility(mode) {
    recommendationsWhitelistGroup.style.display = mode === 'whitelist' ? 'block' : 'none';
  }

  function notifyYoutubeTabs(payload) {
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateYoutubeRecommendationsSettings',
          payload
        }, () => {
          void chrome.runtime.lastError;
        });
      });
    });
  }

  chrome.storage.local.get(['youtubeRecommendationsMode', 'youtubeRecommendationsWhitelist'], (result) => {
    const mode = result.youtubeRecommendationsMode || 'enabled';
    const radio = document.querySelector(`input[name="recommendationsMode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    updateRecommendationsWhitelistVisibility(mode);
    recommendationsWhitelistInput.value = result.youtubeRecommendationsWhitelist || '';
  });

  recommendationModeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      const mode = event.target.value;
      chrome.storage.local.set({ youtubeRecommendationsMode: mode }, () => {
        updateRecommendationsWhitelistVisibility(mode);
        notifyYoutubeTabs({ mode });
      });
    });
  });

  recommendationsWhitelistInput.addEventListener('input', () => {
    const whitelist = recommendationsWhitelistInput.value;
    chrome.storage.local.set({ youtubeRecommendationsWhitelist: whitelist }, () => {
      notifyYoutubeTabs({ whitelist });
    });
  });

  /**
   * 从 URL 提取视频 ID
   */
  function extractVideoId(url) {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  function showYoutubeStatus(text, type = '') {
    youtubeStatus.textContent = text;
    youtubeStatus.className = `status-message ${type}`;
    if (type !== 'error') {
      // 保持显示更长时间，方便批量下载查看
      setTimeout(() => {
        // 如果是成功消息，才清除
        if (type === 'success' && text.includes('下载成功')) {
          youtubeStatus.textContent = '';
          youtubeStatus.className = 'status-message';
        }
      }, 5000);
    }
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });
  }

  function sanitizeDownloadFilename(name, fallback = 'video') {
    const cleaned = String(name || '').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    return (cleaned || fallback).slice(0, 150);
  }

  function getDateForFilename() {
    const date = new Date();
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  }

  function buildYoutubeFilename(template, { channel, title, id }) {
    const base = (template || '{channel}-{title}-{date}')
      .replaceAll('{channel}', sanitizeDownloadFilename(channel, '未知频道'))
      .replaceAll('{title}', sanitizeDownloadFilename(title, `video_${id}`))
      .replaceAll('{date}', getDateForFilename())
      .replaceAll('{id}', sanitizeDownloadFilename(id, 'video'));
    return `${sanitizeDownloadFilename(base, `video_${id}`)}.jpg`;
  }

  // 单视频下载 (使用 oEmbed 获取标题)
  btnDownloadThumbnail.addEventListener('click', async () => {
    const url = youtubeUrlInput.value.trim();

    if (!url) {
      showYoutubeStatus('请输入 YouTube 视频链接', 'error');
      youtubeUrlInput.focus();
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      showYoutubeStatus('无法识别的链接格式', 'error');
      return;
    }

    showYoutubeStatus('正在获取视频信息...', 'info');
    btnDownloadThumbnail.disabled = true;

    let videoTitle = `video_${videoId}`;
    let channelName = '未知频道';
    let filename = `video_${videoId}.jpg`;

    // 尝试通过 oEmbed API 获取视频标题
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          videoTitle = data.title;
        }
        if (data.author_name) channelName = data.author_name;
      }
    } catch (e) {
      console.warn('oEmbed fetch failed, using fallback filename', e);
    }

    const storedTemplate = await new Promise(resolve => {
      chrome.storage.local.get(['youtubeThumbnailFilenameTemplate'], result => {
        resolve(result.youtubeThumbnailFilenameTemplate || '{channel}-{title}-{date}');
      });
    });
    filename = buildYoutubeFilename(storedTemplate, { channel: channelName, title: videoTitle, id: videoId });

    const resolution = 'maxresdefault';
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${resolution}.jpg`;

    showYoutubeStatus('正在下载...', 'info');

    const response = await sendRuntimeMessage({
      action: 'downloadThumbnail',
      payload: { url: thumbnailUrl, filename }
    });

    btnDownloadThumbnail.disabled = false;
    if (response && response.success) {
      showYoutubeStatus('下载成功！', 'success');
    } else {
      showYoutubeStatus(response?.error || '封面不存在或下载失败', 'error');
    }
  });

  // 批量下载功能
  btnBatchDownload.addEventListener('click', async () => {
    const url = playlistUrlInput.value.trim();
    const limitRaw = document.querySelector('input[name="batchLimit"]:checked').value;
    const limit = parseInt(limitRaw);

    if (!url) {
      showYoutubeStatus('请输入频道或视频列表链接', 'error');
      playlistUrlInput.focus();
      return;
    }

    if (!url.includes('youtube.com')) {
      showYoutubeStatus('请提供有效的 YouTube 链接', 'error');
      return;
    }

    showYoutubeStatus('正在分析页面数据...', 'info');
    btnBatchDownload.disabled = true;

    try {
      // 1. 获取页面内容
      const response = await fetch(url);
      if (!response.ok) throw new Error('无法访问链接');
      const text = await response.text();

      // 2. 尝试提取 ytInitialData JSON
      // 匹配 var ytInitialData = {...};
      const jsonMatch = text.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) || text.match(/window\["ytInitialData"\]\s*=\s*({.+?});/);

      let videoItems = [];

      if (jsonMatch && jsonMatch[1]) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          // 递归查找所有的 videoRenderer 对象
          videoItems = extractVideosFromJson(data);
        } catch (e) {
          console.warn('JSON Parse Error', e);
          // JSON 解析失败，回退到正则提取 ID (无标题)
          videoItems = extractVideosByRegex(text);
        }
      } else {
        // 没找到 JSON，回退到正则
        videoItems = extractVideosByRegex(text);
      }

      if (videoItems.length === 0) {
        showYoutubeStatus('未找到视频，请确保是公开的列表/频道页', 'error');
        btnBatchDownload.disabled = false;
        return;
      }

      // 去重
      const uniqueItems = [];
      const seenIds = new Set();
      for (const item of videoItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueItems.push(item);
        }
      }

      // 3. 限制数量
      const targetItems = uniqueItems.slice(0, limit);
      showYoutubeStatus(`发现 ${uniqueItems.length} 个视频，准备下载前 ${targetItems.length} 个...`, 'info');

      // 4. 批量下载
      let successCount = 0;
      const storedTemplate = await new Promise(resolve => {
        chrome.storage.local.get(['youtubeThumbnailFilenameTemplate'], result => {
          resolve(result.youtubeThumbnailFilenameTemplate || '{channel}-{title}-{date}');
        });
      });

      for (let i = 0; i < targetItems.length; i++) {
        const item = targetItems[i];
        const thumbUrl = `https://img.youtube.com/vi/${item.id}/maxresdefault.jpg`;

        // 处理文件名：清理非法字符
        const fname = buildYoutubeFilename(storedTemplate, {
          channel: item.channel || '未知频道',
          title: item.title,
          id: item.id
        });

        const response = await sendRuntimeMessage({
          action: 'downloadThumbnail',
          payload: { url: thumbUrl, filename: fname }
        });

        if (response && response.success) {
          successCount++;
        }

        // 更新进度
        if (i % 5 === 0) {
          showYoutubeStatus(`正在下载: ${i + 1}/${targetItems.length}`, 'info');
        }

        // 稍微延时避免瞬间过多请求
        await new Promise(r => setTimeout(r, 200));
      }

      showYoutubeStatus(`批量任务完成！成功下载 ${successCount}/${targetItems.length} 个封面`, successCount > 0 ? 'success' : 'error');

    } catch (err) {
      console.error(err);
      showYoutubeStatus('分析失败: ' + err.message, 'error');
    } finally {
      btnBatchDownload.disabled = false;
    }
  });

  // 辅助函数：从 JSON 递归提取视频信息
  function extractVideosFromJson(obj) {
    let results = [];

    if (!obj) return results;

    // 检查当前对象是否是 Video Renderer
    // 常见类型: videoRenderer, gridVideoRenderer, playlistVideoRenderer, compactVideoRenderer
    const renderer = obj.videoRenderer || obj.gridVideoRenderer || obj.playlistVideoRenderer || obj.compactVideoRenderer || obj.reelItemRenderer;

    if (renderer && renderer.videoId) {
      let title = '';
      if (renderer.title) {
        if (renderer.title.simpleText) title = renderer.title.simpleText;
        else if (renderer.title.runs && renderer.title.runs[0]) title = renderer.title.runs[0].text;
      }
      if (!title && renderer.headline) { // Shorts Sometimes
        if (renderer.headline.simpleText) title = renderer.headline.simpleText;
      }

      results.push({
        id: renderer.videoId,
        title: title,
        channel: renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || ''
      });
    }

    // 递归遍历属性
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        results = results.concat(extractVideosFromJson(obj[key]));
      }
    }

    return results;
  }

  // 辅助函数：正则回退提取
  function extractVideosByRegex(text) {
    const results = [];
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({ id: match[1], title: `video_${match[1]}` });
    }
    return results;
  }

  // 回车触发下载
  youtubeUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnDownloadThumbnail.click();
    }
  });
});
