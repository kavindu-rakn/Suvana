/* ============================================================================
   SOUNDGUARD COMPONENT INTEGRATION — CLIENT MODULE
   ----------------------------------------------------------------------------
   Fully self-contained and modular:
     • Self-contained QR Code engine (zero external dependencies; works offline)
     • Connects with /api/soundguard/info to detect LAN IP & Metro port
     • Generates live Expo Go Android connection QR code (exp://<ip>:8081)
     • Isolated under window.__soundguardModule with no global side-effects.
   ============================================================================ */

(() => {
  "use strict";

  if (window.__soundguardModuleLoaded) return;
  window.__soundguardModuleLoaded = true;

  // ---------------------------------------------------------------------------
  // 1. EMBEDDED LIGHTWEIGHT QR CODE ENGINE (Pure JS, offline)
  // ---------------------------------------------------------------------------
  const QRCodeEngine = (() => {
    // Mode, ErrorCorrectionLevel, Polynomials & RS tables
    const QRMode = { MODE_8BIT_BYTE: 4 };
    const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };

    const QRMath = {
      glog: (n) => {
        if (n < 1) throw new Error("glog(" + n + ")");
        return QRMath.LOG_TABLE[n];
      },
      gexp: (n) => {
        while (n < 0) n += 255;
        while (n >= 256) n -= 255;
        return QRMath.EXP_TABLE[n];
      },
      EXP_TABLE: new Array(256),
      LOG_TABLE: new Array(256),
    };

    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

    function QRPolynomial(num, shift) {
      if (num.length === undefined) throw new Error(num.length + "/" + shift);
      let offset = 0;
      while (offset < num.length && num[offset] === 0) offset++;
      this.num = new Array(num.length - offset + shift);
      for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    }

    QRPolynomial.prototype = {
      get: function (index) { return this.num[index]; },
      getLength: function () { return this.num.length; },
      multiply: function (e) {
        const num = new Array(this.getLength() + e.getLength() - 1);
        for (let i = 0; i < this.getLength(); i++) {
          for (let j = 0; j < e.getLength(); j++) {
            num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
          }
        }
        return new QRPolynomial(num, 0);
      },
      mod: function (e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
        for (let i = 0; i < e.getLength(); i++) {
          num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
      },
    };

    function QRRSBlock(totalCount, dataCount) {
      this.totalCount = totalCount;
      this.dataCount = dataCount;
    }

    QRRSBlock.RS_BLOCK_TABLE = [
      [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
      [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
      [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
      [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
      [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
      [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
      [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
      [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
      [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
      [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    ];

    QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
      const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
      if (!rsBlock) throw new Error("bad rs block @ typeNumber:" + typeNumber);
      const length = rsBlock.length / 3;
      const list = [];
      for (let i = 0; i < length; i++) {
        const count = rsBlock[i * 3 + 0];
        const totalCount = rsBlock[i * 3 + 1];
        const dataCount = rsBlock[i * 3 + 2];
        for (let j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
      }
      return list;
    };

    QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
      switch (errorCorrectLevel) {
        case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
        case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
        case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
        case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
        default: return undefined;
      }
    };

    function QRBitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    QRBitBuffer.prototype = {
      get: function (index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
      },
      put: function (num, length) {
        for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
      },
      putBit: function (bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) this.buffer.push(0);
        if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
        this.length++;
      },
    };

    function QR8bitByte(data) {
      this.mode = QRMode.MODE_8BIT_BYTE;
      this.data = data;
    }
    QR8bitByte.prototype = {
      getLength: function () { return this.data.length; },
      write: function (buffer) {
        for (let i = 0; i < this.data.length; i++) buffer.put(this.data.charCodeAt(i), 8);
      },
    };

    function QRCode(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.modules = null;
      this.moduleCount = 0;
      this.dataCache = null;
      this.dataList = [];
    }

    QRCode.prototype = {
      addData: function (data) {
        this.dataList.push(new QR8bitByte(data));
        this.dataCache = null;
      },
      isDark: function (row, col) {
        if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
          throw new Error(row + "," + col);
        }
        return this.modules[row][col];
      },
      getModuleCount: function () { return this.moduleCount; },
      make: function () {
        if (this.typeNumber < 1) {
          let typeNumber = 1;
          for (; typeNumber < 10; typeNumber++) {
            const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
            const buffer = new QRBitBuffer();
            let totalDataCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
            for (let i = 0; i < this.dataList.length; i++) {
              const data = this.dataList[i];
              buffer.put(data.mode, 4);
              buffer.put(data.getLength(), typeNumber < 10 ? 8 : 16);
              data.write(buffer);
            }
            if (buffer.length <= totalDataCount * 8) break;
          }
          this.typeNumber = typeNumber;
        }
        this.makeImpl(false, this.getBestMaskPattern());
      },
      makeImpl: function (test, maskPattern) {
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = new Array(this.moduleCount);
        for (let row = 0; row < this.moduleCount; row++) {
          this.modules[row] = new Array(this.moduleCount);
          for (let col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
        }
        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this.moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this.moduleCount - 7);
        this.setupPositionAdjustPattern();
        this.setupTimingPattern();
        this.setupTypeInfo(test, maskPattern);
        if (this.typeNumber >= 7) this.setupTypeNumber(test);
        if (this.dataCache == null) this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
        this.mapData(this.dataCache, maskPattern);
      },
      setupPositionProbePattern: function (row, col) {
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || this.moduleCount <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || this.moduleCount <= col + c) continue;
            if (
              (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
              (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4)
            ) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      },
      setupTimingPattern: function () {
        for (let r = 8; r < this.moduleCount - 8; r++) {
          if (this.modules[r][6] !== null) continue;
          this.modules[r][6] = r % 2 === 0;
        }
        for (let c = 8; c < this.moduleCount - 8; c++) {
          if (this.modules[6][c] !== null) continue;
          this.modules[6][c] = c % 2 === 0;
        }
      },
      setupPositionAdjustPattern: function () {
        const pos = [
          [],
          [6, 18],
          [6, 22],
          [6, 26],
          [6, 30],
          [6, 34],
          [6, 22, 38],
          [6, 24, 42],
          [6, 26, 46],
          [6, 28, 50],
        ][this.typeNumber - 1] || [];
        for (let i = 0; i < pos.length; i++) {
          for (let j = 0; j < pos.length; j++) {
            const row = pos[i];
            const col = pos[j];
            if (this.modules[row][col] !== null) continue;
            for (let r = -2; r <= 2; r++) {
              for (let c = -2; c <= 2; c++) {
                this.modules[row + r][col + c] =
                  Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
              }
            }
          }
        }
      },
      setupTypeInfo: function (test, maskPattern) {
        const data = (this.errorCorrectLevel << 3) | maskPattern;
        let bits = data << 10;
        while (QRCode.getBCHTypeInfo(bits) >= 0) {
          bits ^= 0x537 << QRCode.getBCHTypeInfo(bits);
        }
        const info = ((data << 10) | bits) ^ 0x5412;
        for (let i = 0; i < 15; i++) {
          const mod = !test && ((info >> i) & 1) === 1;
          if (i < 6) this.modules[i][8] = mod;
          else if (i < 8) this.modules[i + 1][8] = mod;
          else this.modules[this.moduleCount - 15 + i][8] = mod;
        }
        for (let i = 0; i < 15; i++) {
          const mod = !test && ((info >> i) & 1) === 1;
          if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
          else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
          else this.modules[8][15 - i - 1] = mod;
        }
        this.modules[this.moduleCount - 8][8] = !test;
      },
      setupTypeNumber: function () {},
      mapData: function (data, maskPattern) {
        let inc = -1;
        let row = this.moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        for (let col = this.moduleCount - 1; col > 0; col -= 2) {
          if (col === 6) col--;
          while (true) {
            for (let c = 0; c < 2; c++) {
              if (this.modules[row][col - c] === null) {
                let dark = false;
                if (byteIndex < data.length) {
                  dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                }
                const mask = (row + (col - c)) % 2 === 0;
                if (mask) dark = !dark;
                this.modules[row][col - c] = dark;
                bitIndex--;
                if (bitIndex === -1) {
                  byteIndex++;
                  bitIndex = 7;
                }
              }
            }
            row += inc;
            if (row < 0 || this.moduleCount <= row) {
              row -= inc;
              inc = -inc;
              break;
            }
          }
        }
      },
      getBestMaskPattern: function () { return 0; },
    };

    QRCode.createData = function (typeNumber, errorCorrectLevel, dataList) {
      const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
      const buffer = new QRBitBuffer();
      for (let i = 0; i < dataList.length; i++) {
        const data = dataList[i];
        buffer.put(data.mode, 4);
        buffer.put(data.getLength(), typeNumber < 10 ? 8 : 16);
        data.write(buffer);
      }
      let totalDataCount = 0;
      for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
      if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.length % 8 !== 0) buffer.putBit(false);
      while (true) {
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0xec, 8);
        if (buffer.length >= totalDataCount * 8) break;
        buffer.put(0x11, 8);
      }
      return QRCode.createBytes(buffer, rsBlocks);
    };

    QRCode.createBytes = function (buffer, rsBlocks) {
      let offset = 0;
      let maxDcCount = 0;
      let maxEcCount = 0;
      const dcdata = new Array(rsBlocks.length);
      const ecdata = new Array(rsBlocks.length);
      for (let r = 0; r < rsBlocks.length; r++) {
        const dcCount = rsBlocks[r].dataCount;
        const ecCount = rsBlocks[r].totalCount - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);
        dcdata[r] = new Array(dcCount);
        for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
        offset += dcCount;
        const rsPoly = (function (errorCorrectLength) {
          let a = new QRPolynomial([1], 0);
          for (let i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
          }
          return a;
        })(ecCount);
        const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
        const modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (let i = 0; i < ecdata[r].length; i++) {
          const modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
        }
      }
      const data = [];
      for (let i = 0; i < maxDcCount; i++) {
        for (let r = 0; r < rsBlocks.length; r++) {
          if (i < dcdata[r].length) data.push(dcdata[r][i]);
        }
      }
      for (let i = 0; i < maxEcCount; i++) {
        for (let r = 0; r < rsBlocks.length; r++) {
          if (i < ecdata[r].length) data.push(ecdata[r][i]);
        }
      }
      return data;
    };

    QRCode.getBCHTypeInfo = function (data) {
      let d = data >> 10;
      let i = 0;
      while (d > 0) {
        i++;
        d >>>= 1;
      }
      return i - 1;
    };

    return {
      generateSVG: function (text, size = 200) {
        const qr = new QRCode(0, QRErrorCorrectLevel.M);
        qr.addData(text);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = size / count;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">`;
        svg += `<rect width="${size}" height="${size}" fill="#ffffff"/>`;
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
              svg += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#040e1c"/>`;
            }
          }
        }
        svg += `</svg>`;
        return svg;
      },
    };
  })();

  // ---------------------------------------------------------------------------
  // 2. STATE & DEFAULT CONFIGURATION
  // ---------------------------------------------------------------------------
  const DEFAULT_PORT = 8081;
  let currentIp = window.location.hostname || "192.168.8.126";
  if (currentIp === "localhost" || currentIp === "127.0.0.1") {
    currentIp = "192.168.8.126";
  }
  let currentPort = DEFAULT_PORT;
  let isMetroRunning = false;

  // ---------------------------------------------------------------------------
  // 3. MODAL BUILDER & INJECTION
  // ---------------------------------------------------------------------------
  function createModalDOM() {
    let overlay = document.getElementById("sgModalOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "sg-modal-overlay";
    overlay.id = "sgModalOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Alerts mobile app connection");

    overlay.innerHTML = `
      <div class="sg-modal">
        <button class="sg-modal-close" id="sgModalClose" title="Close modal" aria-label="Close modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>

        <div class="sg-modal-head">
          <span class="sg-modal-badge" id="sgMetroBadge">
            <span class="sg-pulse-dot"></span>
            <span id="sgMetroStatusText">Checking Metro Bundler...</span>
          </span>
          <h3>Connect the Alerts app</h3>
          <p>Scan the live QR code with <strong>Expo Go</strong> on Android to start the mobile companion.</p>
        </div>

        <div class="sg-qr-presentation">
          <div class="sg-qr-frame" id="sgQrFrame">
            <div id="sgQrSlot"></div>
            <div class="sg-qr-corners">
              <span class="sg-corner tl"></span>
              <span class="sg-corner tr"></span>
              <span class="sg-corner bl"></span>
              <span class="sg-corner br"></span>
            </div>
            <div class="sg-scan-bar"></div>
          </div>
        </div>

        <div class="sg-url-strip">
          <input type="text" id="sgExpoUrlInput" spellcheck="false" title="Expo Connection URI" />
          <button class="sg-copy-btn" id="sgCopyUrlBtn" title="Copy Expo URI">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        </div>

        <div class="sg-steps-box">
          <h4>Quick Connect Instructions (Android)</h4>
          <ol>
            <li>Install &amp; open <strong>Expo Go</strong> on your Android phone (or use Camera).</li>
            <li>Scan the QR code above or paste the <code>exp://</code> URL.</li>
            <li>Alerts will launch immediately with sound awareness &amp; SOS!</li>
          </ol>
        </div>

        <div class="sg-terminal-box">
          <span>Terminal launch command:</span>
          <code>npx expo start</code>
          <button class="sg-copy-btn" id="sgCopyCmdBtn" title="Copy command">
            <span>Copy</span>
          </button>
        </div>

        <div class="sg-modal-actions">
          <a class="sg-btn-secondary" id="sgOpenWebBtn" target="_blank" rel="noopener noreferrer">
            Open Web Preview &rarr;
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bind modal internal events
    const closeBtn = document.getElementById("sgModalClose");
    closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    const urlInput = document.getElementById("sgExpoUrlInput");
    urlInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (val) renderQRCode(val);
    });

    const copyUrlBtn = document.getElementById("sgCopyUrlBtn");
    copyUrlBtn.addEventListener("click", () => {
      copyToClipboard(urlInput.value, copyUrlBtn);
    });

    const copyCmdBtn = document.getElementById("sgCopyCmdBtn");
    copyCmdBtn.addEventListener("click", () => {
      copyToClipboard("npx expo start", copyCmdBtn);
    });

    return overlay;
  }

  function renderQRCode(url) {
    const slot = document.getElementById("sgQrSlot");
    if (!slot) return;
    try {
      slot.innerHTML = QRCodeEngine.generateSVG(url, 208);
    } catch (e) {
      console.warn("QR render fallback:", e);
      slot.innerHTML = `<div style="padding:20px;color:#333;font-size:12px;">QR error: ${e.message}</div>`;
    }
  }

  function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
      const span = btnElement.querySelector("span");
      const orig = span.textContent;
      span.textContent = "Copied!";
      btnElement.classList.add("copied");
      setTimeout(() => {
        span.textContent = orig;
        btnElement.classList.remove("copied");
      }, 2000);
    }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // 4. API DISCOVERY & STATUS POLLING
  // ---------------------------------------------------------------------------
  async function fetchSoundGuardInfo() {
    try {
      const res = await fetch(`/api/soundguard/info?port=${currentPort}`);
      if (res.ok) {
        const data = await res.json();
        if (data.primaryIp) currentIp = data.primaryIp;
        if (data.port) currentPort = data.port;
        isMetroRunning = !!data.metroRunning;
        return data;
      }
    } catch (_) {
      // Backend router fallback
    }
    return {
      primaryIp: currentIp,
      port: currentPort,
      metroRunning: false,
      expoUrl: `exp://${currentIp}:${currentPort}`,
      webUrl: `http://${currentIp}:${currentPort}`,
    };
  }

  async function updateModalState() {
    createModalDOM();
    const info = await fetchSoundGuardInfo();
    const expoUrl = info.expoUrl || `exp://${currentIp}:${currentPort}`;
    const webUrl = info.webUrl || `http://${currentIp}:${currentPort}`;

    const urlInput = document.getElementById("sgExpoUrlInput");
    if (urlInput) urlInput.value = expoUrl;

    const webBtn = document.getElementById("sgOpenWebBtn");
    if (webBtn) webBtn.href = webUrl;

    const statusBadge = document.getElementById("sgMetroStatusText");
    if (statusBadge) {
      if (info.metroRunning) {
        statusBadge.textContent = `Metro Active (Port ${currentPort})`;
        statusBadge.style.color = "#33e0a2";
      } else {
        statusBadge.textContent = `Expo Ready · exp://${currentIp}:${currentPort}`;
        statusBadge.style.color = "#a2bdb8";
      }
    }

    renderQRCode(expoUrl);
  }

  function openModal() {
    const overlay = createModalDOM();
    updateModalState();
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const overlay = document.getElementById("sgModalOverlay");
    if (overlay) {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ---------------------------------------------------------------------------
  // 5. GLOBAL EVENT DELEGATION FOR LAUNCH BUTTONS
  // ---------------------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action='soundguard-qr']");
    if (target) {
      e.preventDefault();
      openModal();
    }
  });

  // Export public API
  window.SoundGuard = {
    openQR: openModal,
    closeQR: closeModal,
    getInfo: fetchSoundGuardInfo,
  };

  // Initial background poll for IP info
  fetchSoundGuardInfo();
})();
