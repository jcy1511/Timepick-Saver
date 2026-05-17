document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const generateGridBtn = document.getElementById('generate-grid');
  const gridContainer = document.getElementById('grid-container');
  const gridHeader = document.getElementById('grid-header');
  const gridBody = document.getElementById('grid-body');
  
  const saveScheduleBtn = document.getElementById('save-schedule');
  const deleteScheduleBtn = document.getElementById('delete-schedule');
  const autoFillBtn = document.getElementById('auto-fill');

  // Calendar Elements
  const calendarGrid = document.getElementById('calendar-grid');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const currentMonthYear = document.getElementById('current-month-year');

  // Time Dropdown Elements
  const startTimeSelect = document.getElementById('start-time-select');
  const startTimeText = document.getElementById('start-time-text');
  const startTimeOptions = document.getElementById('start-time-options');
  const endTimeSelect = document.getElementById('end-time-select');
  const endTimeText = document.getElementById('end-time-text');
  const endTimeOptions = document.getElementById('end-time-options');

  // State
  let isDragging = false;
  let dragMode = null; 
  let lastDraggedCell = null;
  let selectedCells = new Set(); 
  
  // Custom UI State
  let currentDate = new Date();
  let rangeStart = null;
  let rangeEnd = null;
  let selectedStartTime = "09:00";
  let selectedEndTime = "24:00";

  // Init Date/Time data
  chrome.storage.local.get(['timepickData'], (result) => {
    if (result.timepickData) {
      const data = result.timepickData;
      
      if (data.rangeStart) rangeStart = new Date(data.rangeStart);
      if (data.rangeEnd) rangeEnd = new Date(data.rangeEnd);
      if (data.selectedStartTime) selectedStartTime = data.selectedStartTime;
      if (data.selectedEndTime) selectedEndTime = data.selectedEndTime;

      if (data.selectedCells) {
        selectedCells = new Set(data.selectedCells);
      }

      if (rangeStart && rangeEnd) {
        currentDate = new Date(rangeStart);
      }
    }
    
    updateTimeText(startTimeText, selectedStartTime);
    updateTimeText(endTimeText, selectedEndTime);
    
    renderCalendar();
    
    if (rangeStart && rangeEnd) {
      generateGrid();
    }
  });

  // Time Options Initialization
  function populateTimeOptions(container, callback) {
    container.innerHTML = '';
    for (let h = 0; h <= 24; h++) {
      if (h === 24 && container === startTimeOptions) continue;
      if (h === 0 && container === endTimeOptions) continue;

      const hh = String(h).padStart(2, '0');
      const val = `${hh}:00`;
      
      let text = '';
      if (h === 24) {
        text = '24시 (밤 12시)';
      } else if (h === 0) {
        text = '0시 (자정)';
      } else {
        const ampm = h < 12 ? '오전' : (h === 12 ? '오후' : '오후');
        const displayH = h > 12 ? h - 12 : h;
        text = `${h}시 (${ampm} ${displayH}시)`;
      }

      const div = document.createElement('div');
      div.className = 'option-item';
      div.textContent = text;
      div.dataset.val = val;
      
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        callback(val, text);
        container.classList.remove('open');
      });
      
      container.appendChild(div);
    }
  }

  function updateTimeText(element, timeVal) {
    const h = parseInt(timeVal.split(':')[0], 10);
    if (h === 24) {
      element.textContent = '24시 (밤 12시)';
    } else if (h === 0) {
      element.textContent = '0시 (자정)';
    } else {
      const ampm = h < 12 ? '오전' : (h === 12 ? '오후' : '오후');
      const displayH = h > 12 ? h - 12 : h;
      element.textContent = `${h}시 (${ampm} ${displayH}시)`;
    }
  }

  populateTimeOptions(startTimeOptions, (val, text) => {
    selectedStartTime = val;
    startTimeText.textContent = text;
  });

  populateTimeOptions(endTimeOptions, (val, text) => {
    selectedEndTime = val;
    endTimeText.textContent = text;
  });

  startTimeSelect.addEventListener('click', () => {
    endTimeOptions.classList.remove('open');
    startTimeOptions.classList.toggle('open');
  });

  endTimeSelect.addEventListener('click', () => {
    startTimeOptions.classList.remove('open');
    endTimeOptions.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!startTimeSelect.contains(e.target)) startTimeOptions.classList.remove('open');
    if (!endTimeSelect.contains(e.target)) endTimeOptions.classList.remove('open');
  });

  // Calendar Logic
  function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonthYear.textContent = `${year}년 ${month + 1}월`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'cal-cell empty';
      calendarGrid.appendChild(emptyDiv);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      
      const span = document.createElement('span');
      span.textContent = i;
      cell.appendChild(span);
      
      const cellDate = new Date(year, month, i);
      
      if (rangeStart && cellDate.getTime() === rangeStart.getTime()) {
        cell.classList.add('selected');
        if (rangeEnd && rangeStart.getTime() !== rangeEnd.getTime()) {
          cell.classList.add('in-range', 'start');
        }
      }
      if (rangeEnd && cellDate.getTime() === rangeEnd.getTime()) {
        cell.classList.add('selected');
        if (rangeStart && rangeStart.getTime() !== rangeEnd.getTime()) {
          cell.classList.add('in-range', 'end');
        }
      }
      
      if (rangeStart && rangeEnd && cellDate > rangeStart && cellDate < rangeEnd) {
        cell.classList.add('in-range');
      }
      
      cell.addEventListener('click', () => {
        if (!rangeStart || (rangeStart && rangeEnd)) {
          rangeStart = cellDate;
          rangeEnd = null;
        } else if (rangeStart && !rangeEnd) {
          if (cellDate < rangeStart) {
            rangeEnd = rangeStart;
            rangeStart = cellDate;
          } else {
            rangeEnd = cellDate;
          }
        }
        renderCalendar();
      });
      
      calendarGrid.appendChild(cell);
    }
  }

  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });


  // Grid Generation Logic
  generateGridBtn.addEventListener('click', () => {
    if (!rangeStart || !rangeEnd) {
      if (rangeStart && !rangeEnd) {
        rangeEnd = new Date(rangeStart);
      } else {
        alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
        return;
      }
    }
    
    const [sh, sm] = selectedStartTime.split(':').map(Number);
    const [eh, em] = selectedEndTime.split(':').map(Number);
    if ((sh * 60 + sm) >= (eh * 60 + em)) {
      alert('시작 시간이 종료 시간보다 늦거나 같을 수 없습니다.');
      return;
    }

    generateGrid();
    setTimeout(() => {
      gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });

  function generateGrid() {
    const dates = [];
    let currentD = new Date(rangeStart);
    while (currentD <= rangeEnd) {
      dates.push(new Date(currentD));
      currentD.setDate(currentD.getDate() + 1);
    }

    const times = [];
    const [sh, sm] = selectedStartTime.split(':').map(Number);
    const [eh, em] = selectedEndTime.split(':').map(Number);
    
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    for (let m = startMin; m < endMin; m += 15) {
      const hr = Math.floor(m / 60).toString().padStart(2, '0');
      const mn = (m % 60).toString().padStart(2, '0');
      times.push(`${hr}:${mn}`);
    }

    renderGrid(dates, times);
  }

  function renderGrid(dates, times) {
    gridHeader.innerHTML = '<th class="corner-th"></th>';
    gridBody.innerHTML = '';

    const days = ['일', '월', '화', '수', '목', '금', '토'];

    dates.forEach(date => {
      const th = document.createElement('th');
      const mm = date.getMonth() + 1;
      const dd = date.getDate();
      const day = days[date.getDay()];
      th.innerHTML = `<div class="date-header">${mm}/${dd}<br>${day}</div>`;
      
      const yyyy = date.getFullYear();
      const mmStr = String(mm).padStart(2, '0');
      const ddStr = String(dd).padStart(2, '0');
      const dateStr = `${yyyy}-${mmStr}-${ddStr}`;

      th.addEventListener('click', () => {
        const cellsForDate = document.querySelectorAll(`td.cell[data-key^="${dateStr}|"]`);
        let allSelected = true;
        cellsForDate.forEach(td => {
          if (!td.classList.contains('selected')) allSelected = false;
        });

        cellsForDate.forEach(td => {
          const cellKey = td.dataset.key;
          if (allSelected) {
            td.classList.remove('selected');
            selectedCells.delete(cellKey);
          } else {
            td.classList.add('selected');
            selectedCells.add(cellKey);
          }
        });
      });

      gridHeader.appendChild(th);
    });

    times.forEach(time => {
      const tr = document.createElement('tr');
      const isHourRow = time.endsWith(':00');
      const isHalfHourRow = time.endsWith(':30');
      
      if (isHalfHourRow) {
        tr.classList.add('half-hour-row');
      }
      
      if (isHourRow) {
        tr.classList.add('hour-row');
        const timeTd = document.createElement('td');
        timeTd.className = 'time-label';
        timeTd.rowSpan = 4;
        const h = parseInt(time.split(':')[0], 10);
        
        let displayStr = '';
        if (h === 0) displayStr = '오전 12시';
        else if (h === 12) displayStr = '오후 12시';
        else displayStr = h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`;

        timeTd.innerHTML = `<span>${displayStr}</span>`;
        tr.appendChild(timeTd);
      }

      dates.forEach(date => {
        const td = document.createElement('td');
        td.className = 'cell';
        
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const cellKey = `${dateStr}|${time}`;
        
        td.dataset.key = cellKey;

        if (selectedCells.has(cellKey)) {
          td.classList.add('selected');
        }

        td.addEventListener('mousedown', (e) => {
          isDragging = true;
          lastDraggedCell = td;
          if (td.classList.contains('selected')) {
            dragMode = 'deselect';
            td.classList.remove('selected');
            selectedCells.delete(cellKey);
          } else {
            dragMode = 'select';
            td.classList.add('selected');
            selectedCells.add(cellKey);
          }
        });

        td.addEventListener('mouseenter', (e) => {
          if (isDragging) {
            if (lastDraggedCell) {
              const [cDate, cTime] = cellKey.split('|');
              const [lDate, lTime] = lastDraggedCell.dataset.key.split('|');
              
              if (cDate === lDate) {
                const idx1 = times.indexOf(cTime);
                const idx2 = times.indexOf(lTime);
                const startIdx = Math.min(idx1, idx2);
                const endIdx = Math.max(idx1, idx2);
                
                for(let i = startIdx; i <= endIdx; i++) {
                  const fillKey = `${cDate}|${times[i]}`;
                  const fillTd = document.querySelector(`td.cell[data-key="${fillKey}"]`);
                  if (fillTd) {
                    if (dragMode === 'select') {
                      fillTd.classList.add('selected');
                      selectedCells.add(fillKey);
                    } else {
                      fillTd.classList.remove('selected');
                      selectedCells.delete(fillKey);
                    }
                  }
                }
              }
            } else {
              if (dragMode === 'select') {
                td.classList.add('selected');
                selectedCells.add(cellKey);
              } else if (dragMode === 'deselect') {
                td.classList.remove('selected');
                selectedCells.delete(cellKey);
              }
            }
            lastDraggedCell = td;
          }
        });

        tr.appendChild(td);
      });

      gridBody.appendChild(tr);
    });

    gridContainer.style.display = 'block';
  }

  document.addEventListener('mouseup', () => {
    isDragging = false;
    dragMode = null;
    lastDraggedCell = null;
  });
  
  document.addEventListener('dragstart', (e) => e.preventDefault());

  // Save Logic
  saveScheduleBtn.addEventListener('click', () => {
    const dataToSave = {
      rangeStart: rangeStart ? rangeStart.toISOString() : null,
      rangeEnd: rangeEnd ? rangeEnd.toISOString() : null,
      selectedStartTime,
      selectedEndTime,
      selectedCells: Array.from(selectedCells)
    };
    
    chrome.storage.local.set({ timepickData: dataToSave }, () => {
      saveScheduleBtn.textContent = '저장 완료!';
      setTimeout(() => {
        saveScheduleBtn.textContent = '시간표 저장';
      }, 1500);
    });
  });

  // Delete Logic
  deleteScheduleBtn.addEventListener('click', () => {
    if (confirm('저장된 시간표 데이터를 모두 삭제하시겠습니까?')) {
      chrome.storage.local.remove('timepickData', () => {
        selectedCells.clear();
        rangeStart = null;
        rangeEnd = null;
        selectedStartTime = "09:00";
        selectedEndTime = "24:00";
        
        updateTimeText(startTimeText, selectedStartTime);
        updateTimeText(endTimeText, selectedEndTime);
        
        gridContainer.style.display = 'none';
        renderCalendar();
        
        deleteScheduleBtn.textContent = '삭제됨';
        setTimeout(() => {
          deleteScheduleBtn.textContent = '시간표 삭제';
        }, 1500);
      });
    }
  });

  // Auto Fill Logic
  autoFillBtn.addEventListener('click', async () => {
    if (selectedCells.size === 0) {
      alert('저장된 시간표 셀이 없습니다.');
      return;
    }

    const savedCells = Array.from(selectedCells);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url && tab.url.includes("timepick.net")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (savedCells) => {
          const firstCell = document.getElementById('availability/0-0');
          if (!firstCell) {
            alert('타임픽 시간표 격자를 화면에서 찾을 수 없습니다.');
            return 0;
          }

          const rect = firstCell.getBoundingClientRect();
          const allDivs = document.querySelectorAll('div, p, span, th, td');
          
          let startYear = new Date().getFullYear();
          let startMonth = new Date().getMonth();
          let startDateNum = null;
          let startH = null;
          let startM = 0;

          // 1. 연도/월 탐색
          for (const el of allDivs) {
            const text = el.innerText?.trim();
            if (!text) continue;
            let m = text.match(/(\d{4})년\s+(\d{1,2})월/);
            if (m) {
              startYear = parseInt(m[1], 10);
              startMonth = parseInt(m[2], 10) - 1;
              break;
            }
          }

          // 2. 시작 날짜(일) 탐색 (x=0 바로 위)
          for (const el of allDivs) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && Math.abs(r.left + r.width/2 - (rect.left + rect.width/2)) < 40 && r.bottom <= rect.top + 10) {
              const text = el.innerText?.trim();
              if (!text) continue;
              let m = text.match(/^(\d{1,2})$/);
              if (m) {
                startDateNum = parseInt(m[1], 10);
                break;
              }
              m = text.match(/(\d{1,2})\/(\d{1,2})/);
              if (m) {
                startMonth = parseInt(m[1], 10) - 1;
                startDateNum = parseInt(m[2], 10);
                break;
              }
            }
          }

          // 3. 시작 시간 탐색 (y=0 좌측)
          for (const el of allDivs) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && Math.abs(r.top - rect.top) < 30 && r.right <= rect.left + 10) {
              const text = el.innerText?.trim();
              if (!text) continue;
              let m = text.match(/(오전|오후)?\s*(\d{1,2})(?:시|:(\d{2}))?/);
              if (m) {
                let ampm = m[1];
                let h = parseInt(m[2], 10);
                let mn = m[3] ? parseInt(m[3], 10) : 0;
                if (ampm === '오후' && h < 12) h += 12;
                if (ampm === '오전' && h === 12) h = 0;
                startH = h;
                startM = mn;
                break;
              }
            }
          }

          if (startDateNum === null) startDateNum = new Date().getDate();
          if (startH === null) startH = 9;

          const tpStartDate = new Date(startYear, startMonth, startDateNum);
          const tpStartTotalMinutes = startH * 60 + startM;

          const idsToFill = [];
          savedCells.forEach(cellKey => {
            const [cellDateStr, cellTimeStr] = cellKey.split('|');
            const cellDate = new Date(cellDateStr + 'T00:00:00');
            const [cellH, cellM] = cellTimeStr.split(':').map(Number);
            const cellTotalMinutes = cellH * 60 + cellM;

            const diffDays = Math.round((cellDate.getTime() - tpStartDate.getTime()) / (1000 * 60 * 60 * 24));
            const diffMinutes = cellTotalMinutes - tpStartTotalMinutes;
            const diffIntervals = Math.floor(diffMinutes / 15);

            if (diffDays >= 0 && diffIntervals >= 0) {
              idsToFill.push(`availability/${diffDays}-${diffIntervals}`);
            }
          });

          let successCount = 0;
          for (const id of idsToFill) {
            const el = document.getElementById(id);
            if (el) {
              ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                el.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
              });
              successCount++;
              await new Promise(r => setTimeout(r, 10));
            }
          }
          return successCount;
        },
        args: [savedCells]
      }, (results) => {
        if (chrome.runtime.lastError) {
          alert('타임픽 페이지에서 새로고침을 한번 한 뒤 다시 시도해주세요.\n에러: ' + chrome.runtime.lastError.message);
        } else {
          const count = results && results[0] ? results[0].result : 0;
          if (count === 0) {
            alert('페이지와 일치하는 시간 셀을 찾을 수 없거나 인식에 실패했습니다.');
          } else {
            autoFillBtn.textContent = `✓ ${count}개 채우기 완료`;
            setTimeout(() => {
              autoFillBtn.textContent = '✨ 타임픽 자동 채우기';
            }, 2000);
          }
        }
      });
    } else {
      alert('타임픽(timepick.net) 페이지에서 실행해주세요.');
    }
  });
});
