// 数据存储
let loanTypes = JSON.parse(localStorage.getItem("loanTypes")) || [];
let myLoans = JSON.parse(localStorage.getItem("myLoans")) || [];
let currentLoanTypeId = 1;
let currentMyLoanId = 1;
const closeAllModals = () => {
  // 直接通过ID获取模态框元素，避免依赖可能未初始化的变量
  const modals = [
    document.getElementById("loan-type-modal"),
    document.getElementById("my-loan-modal"),
    document.getElementById("loan-detail-modal"),
  ];
  modals.forEach((m) => {
    if (m) {
      m.style.display = "none";
    }
  });
};

// 公积金历年利率初始化（仅在无数据时）
if (loanTypes.length === 0) {
  loanTypes = [
    {
      id: 1,
      name: "公积金贷款",
      rateChanges: [
        { date: "2015-10", rate: 3.25 },
        { date: "2012-07", rate: 3.5 },
        { date: "2012-06", rate: 4.0 },
        { date: "2011-07", rate: 4.5 },
        { date: "2011-04", rate: 4.7 },
      ].sort((a, b) => new Date(a.date) - new Date(b.date)),
    },
  ];
  localStorage.setItem("loanTypes", JSON.stringify(loanTypes));
}

// 初始化ID计数器
if (loanTypes.length > 0) {
  currentLoanTypeId = Math.max(...loanTypes.map((t) => t.id)) + 1;
}
if (myLoans.length > 0) {
  currentMyLoanId = Math.max(...myLoans.map((l) => l.id)) + 1;
}

// DOM元素
let tabButtons = null;
let tabContents = null;
let loanTypesList = null;
let myLoansList = null;

// 模态框元素
let loanTypeModal = null;
let myLoanModal = null;
let loanDetailModal = null;
let closeModalButtons = null;

// 初始化页面
document.addEventListener("DOMContentLoaded", () => {
  // 获取DOM元素
  tabButtons = document.querySelectorAll(".tab-button");
  tabContents = document.querySelectorAll(".tab-content");
  loanTypesList = document.getElementById("loan-types-list");
  myLoansList = document.getElementById("my-loans-list");

  // 模态框元素
  loanTypeModal = document.getElementById("loan-type-modal");
  myLoanModal = document.getElementById("my-loan-modal");
  loanDetailModal = document.getElementById("loan-detail-modal");
  closeModalButtons = document.querySelectorAll(
    ".close-modal, .close-modal-btn",
  );

  // 关闭详情页面按钮
  const closeDetailPageBtn = document.getElementById("close-detail-page");
  if (closeDetailPageBtn) {
    closeDetailPageBtn.addEventListener("click", () => {
      const detailPage = document.getElementById("loan-detail-page");
      if (detailPage) {
        detailPage.classList.remove("active");
      }
    });
  }

  renderLoanTypes();
  renderMyLoans();
  setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
  // 标签切换
  if (tabButtons) {
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.getAttribute("data-tab");

        // 更新标签按钮状态
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // 更新内容显示
        tabContents.forEach((content) => content.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
      });
    });
  }

  // 添加贷款类型按钮
  const addLoanTypeBtn = document.getElementById("add-loan-type");
  if (addLoanTypeBtn) {
    addLoanTypeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById("loan-type-modal-title").textContent =
        "添加贷款类型";
      const loanTypeForm = document.getElementById("loan-type-form");
      if (loanTypeForm) loanTypeForm.reset();
      const loanTypeIdInput = document.getElementById("loan-type-id");
      if (loanTypeIdInput) loanTypeIdInput.value = "";

      // 设置默认当前月份
      const currentMonth = getCurrentMonth();
      const rateChangesContainer = document.getElementById(
        "rate-changes-container",
      );
      if (rateChangesContainer) {
        rateChangesContainer.innerHTML = `
                        <div class="rate-change-item">
                            <label>开始年月：</label>
                            <input type="month" class="change-date" value="${currentMonth}">
                            <label>新利率（%）：</label>
                            <input type="number" class="change-rate" step="0.01" min="0" value="3.25">
                            <button type="button" class="secondary remove-rate-change">删除</button>
                        </div>
                    `;
        setupRateChangeEvents();
      }
      if (loanTypeModal) loanTypeModal.style.display = "flex";
    });
  }

  // 添加我的贷款按钮
  const addMyLoanBtn = document.getElementById("add-my-loan");
  if (addMyLoanBtn) {
    addMyLoanBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById("my-loan-modal-title").textContent = "添加贷款";
      const myLoanForm = document.getElementById("my-loan-form");
      if (myLoanForm) myLoanForm.reset();
      const myLoanIdInput = document.getElementById("my-loan-id");
      if (myLoanIdInput) myLoanIdInput.value = "";
      const loanStartDateInput = document.getElementById("loan-start-date");
      if (loanStartDateInput) loanStartDateInput.value = getCurrentMonth();
      updateSubLoanTypes();
      setupSubLoanEvents();
      updateSubLoanTotal();
      if (myLoanModal) myLoanModal.style.display = "flex";
    });
  }

  // 使用事件委托处理贷款类型列表中的按钮
  if (loanTypesList) {
    loanTypesList.addEventListener("click", (e) => {
      const target = e.target;
      const listItemHeader = target.closest(".list-item-header");
      const listItem = target.closest(".list-item");

      // 如果点击的是 list-item-header（但不是按钮区域），则展开/收起
      if (
        listItemHeader &&
        !target.closest(".list-item-actions") &&
        !target.closest("button")
      ) {
        const id = parseInt(listItem?.dataset.id);
        if (id) {
          toggleLoanType(id);
        }
        return;
      }

      // 查找最近的按钮元素（因为点击的可能是按钮内的文本节点）
      const button = target.closest("button");
      if (!button) return;

      // 编辑按钮
      if (button.classList.contains("btn-loan-type-edit")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute("data-id"));
        if (id) editLoanType(id);
        return;
      }

      // 删除按钮
      if (button.classList.contains("btn-loan-type-delete")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute("data-id"));
        if (
          id &&
          confirm("确定要删除这个贷款类型吗？使用该类型的贷款也会受到影响。")
        ) {
          deleteLoanType(id);
        }
        return;
      }
    });
  }

  // 使用事件委托处理我的贷款列表中的按钮
  if (myLoansList) {
    myLoansList.addEventListener("click", (e) => {
      const target = e.target;
      const listItemHeader = target.closest(".list-item-header");
      const listItem = target.closest(".list-item");

      // 如果点击的是 list-item-header（但不是按钮区域），则展开/收起
      if (
        listItemHeader &&
        !target.closest(".list-item-actions") &&
        !target.closest("button")
      ) {
        const id = parseInt(listItem?.dataset.id);
        if (id) {
          toggleMyLoan(id);
        }
        return;
      }

      // 查找最近的按钮元素（因为点击的可能是按钮内的文本节点）
      const button = target.closest("button");
      if (!button) return;

      // 查看计划按钮
      if (button.classList.contains("btn-my-loan-view-schedule")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute("data-id"));
        if (id) viewLoanDetail(id);
        return;
      }

      // 编辑按钮
      if (button.classList.contains("btn-my-loan-edit")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute("data-id"));
        if (id) editMyLoan(id);
        return;
      }

      // 删除按钮
      if (button.classList.contains("btn-my-loan-delete")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute("data-id"));
        if (id && confirm("确定要删除这个贷款吗？")) {
          deleteMyLoan(id);
        }
        return;
      }

      // 收起详情按钮
      if (button.classList.contains("btn-my-loan-collapse")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(button.getAttribute("data-id"));
        if (id) toggleMyLoanDetail(id);
        return;
      }
    });
  }

  // 添加利率变化按钮
  const addRateChangeBtn = document.getElementById("add-rate-change");
  if (addRateChangeBtn) {
    addRateChangeBtn.addEventListener("click", () => {
      const container = document.getElementById("rate-changes-container");
      if (container) {
        const newItem = document.createElement("div");
        newItem.className = "rate-change-item";
        newItem.innerHTML = `
                        <label>开始年月：</label>
                        <input type="month" class="change-date" value="${getCurrentMonth()}">
                        <label>新利率（%）：</label>
                        <input type="number" class="change-rate" step="0.01" min="0" value="4.9">
                        <button type="button" class="secondary remove-rate-change">删除</button>
                    `;
        container.appendChild(newItem);
        setupRateChangeEvents();
      }
    });
  }

  // 添加子贷款按钮
  const addSubLoanBtn = document.getElementById("add-sub-loan");
  if (addSubLoanBtn) {
    addSubLoanBtn.addEventListener("click", () => {
      const container = document.getElementById("sub-loans-container");
      if (container) {
        const newItem = document.createElement("div");
        newItem.className = "sub-loan-item";
        newItem.innerHTML = `
                        <div class="form-group">
                            <label>选择贷款类型：</label>
                            <select class="sub-loan-type">
                                <!-- 贷款类型将动态加载 -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label>还款方式：</label>
                            <select class="sub-loan-repay">
                                <option value="equal-principal-interest">等额本息</option>
                                <option value="equal-principal">等额本金</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>贷款金额（万元）：</label>
                            <input type="number" class="sub-loan-amount" step="0.01" min="0.01" value="10">
                        </div>
                        <button type="button" class="secondary remove-sub-loan">删除</button>
                    `;
        container.appendChild(newItem);
        updateSubLoanTypes();
        setupSubLoanEvents();
      }
    });
  }

  // 关闭模态框
  if (closeModalButtons) {
    closeModalButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeAllModals();
      });
    });
  }

  // 点击模态框外部关闭
  [loanTypeModal, myLoanModal, loanDetailModal].forEach((modal) => {
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
    }
  });

  // ESC键关闭模态框
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (loanTypeModal && loanTypeModal.style.display === "flex")
        loanTypeModal.style.display = "none";
      if (myLoanModal && myLoanModal.style.display === "flex")
        myLoanModal.style.display = "none";
      if (loanDetailModal && loanDetailModal.style.display === "flex")
        loanDetailModal.style.display = "none";
    }
  });

  // 贷款类型表单提交
  const loanTypeForm = document.getElementById("loan-type-form");
  if (loanTypeForm) {
    loanTypeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveLoanType();
    });
  }

  // 我的贷款表单提交
  const myLoanForm = document.getElementById("my-loan-form");
  if (myLoanForm) {
    myLoanForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveMyLoan();
    });
  }
}

// 设置利率变化项的事件
function setupRateChangeEvents() {
  const removeButtons = document.querySelectorAll(".remove-rate-change");
  if (removeButtons) {
    removeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const container = document.getElementById("rate-changes-container");
        if (container && container.children.length > 1) {
          button.parentElement.remove();
        } else {
          showMessage("至少保留一项利率设置", "error");
        }
      });
    });
  }
}

// 设置子贷款项的事件
function setupSubLoanEvents() {
  const removeButtons = document.querySelectorAll(".remove-sub-loan");
  if (removeButtons) {
    removeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const container = document.getElementById("sub-loans-container");
        if (container && container.children.length > 1) {
          button.parentElement.remove();
          updateSubLoanTotal();
        } else {
          showMessage("至少保留一项贷款类型", "error");
        }
      });
    });
  }

  // 金额变化时更新总金额
  const amountInputs = document.querySelectorAll(".sub-loan-amount");
  if (amountInputs) {
    amountInputs.forEach((input) => {
      input.addEventListener("input", updateSubLoanTotal);
    });
  }
}

// 更新子贷款类型下拉框
function updateSubLoanTypes() {
  const selects = document.querySelectorAll(".sub-loan-type");
  if (selects) {
    selects.forEach((select) => {
      select.innerHTML = "";
      loanTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type.id;
        option.textContent = type.name;
        select.appendChild(option);
      });
    });
  }
}

// 更新子贷款总金额显示
function updateSubLoanTotal() {
  const amountInputs = document.querySelectorAll(".sub-loan-amount");
  let total = 0;
  if (amountInputs) {
    amountInputs.forEach((input) => {
      total += parseFloat(input.value) || 0;
    });
  }
  const totalDisplay = document.getElementById("sub-loan-total");
  if (totalDisplay) {
    totalDisplay.textContent = `当前总金额：${total.toFixed(2)}万元`;
  }
  return total;
}

// 渲染贷款类型列表
function renderLoanTypes() {
  if (!loanTypesList) return;
  loanTypesList.innerHTML = "";
  if (loanTypes.length === 0) {
    loanTypesList.innerHTML =
      '<div class="empty-state">暂无贷款类型，点击上方按钮添加</div>';
    return;
  }

  loanTypes.forEach((type) => {
    // 格式化利率变化信息
    let rateChangesHtml = "";
    if (type.rateChanges && type.rateChanges.length > 0) {
      rateChangesHtml =
        "<div style='margin-top: 8px;'><strong>利率变化历史：</strong>";
      type.rateChanges.forEach((change) => {
        rateChangesHtml += `<div>${change.date} 调整为 ${change.rate}%</div>`;
      });
      rateChangesHtml += "</div>";
    }

    const item = document.createElement("div");
    item.className = "list-item";
    item.dataset.id = type.id;
    item.innerHTML = `
                    <div class="list-item-header">
                        <div class="list-item-title">${type.name}</div>
                        <div class="list-item-actions">
                            <button class="secondary btn-loan-type-edit" data-id="${type.id}">编辑</button>
                            <button class="delete btn-loan-type-delete" data-id="${type.id}">删除</button>
                        </div>
                    </div>
                    <div class="list-item-details">
                        <div style="margin-top: 10px;">
                            ${rateChangesHtml}
                        </div>
                    </div>
                    <div class="item-detail-section" id="loan-type-detail-${type.id}">
                        <!-- 详情内容将动态生成 -->
                    </div>
                `;
    loanTypesList.appendChild(item);
  });

  // 默认展示第一条详情
  if (loanTypes.length > 0) {
    const firstId = loanTypes[0].id;
    const firstItem = document.querySelector(
      `.list-item[data-id="${firstId}"]`,
    );
    if (firstItem) firstItem.classList.add("expanded");
    toggleLoanTypeDetail(firstId);
  }
}

// 切换贷款类型详情显示
function toggleLoanTypeDetail(id) {
  const detailSection = document.getElementById(`loan-type-detail-${id}`);
  if (!detailSection) return;

  const isExpanded = detailSection.classList.contains("expanded");

  if (isExpanded) {
    detailSection.classList.remove("expanded");
    detailSection.innerHTML = "";
  } else {
    const type = loanTypes.find((t) => t.id === id);
    if (!type) return;
  }
}

// 渲染我的贷款列表
function renderMyLoans() {
  if (!myLoansList) return;
  myLoansList.innerHTML = "";
  if (myLoans.length === 0) {
    myLoansList.innerHTML =
      '<div class="empty-state">暂无贷款，点击上方按钮添加</div>';
    return;
  }

  myLoans.forEach((loan) => {
    // 计算还款状态
    const totalTerms = loan.terms;
    const startDate = new Date(loan.startDate);
    const currentDate = new Date();
    const monthsPassed =
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth()) +
      1;
    const status = monthsPassed >= totalTerms ? "已完成" : "还款中";
    const statusClass =
      monthsPassed >= totalTerms ? "badge-completed" : "badge-active";

    // 格式化贷款组合信息
    let subLoansHtml = "";
    loan.subLoans.forEach((subLoan) => {
      const type = loanTypes.find((t) => t.id === subLoan.typeId);
      if (type) {
        const repayText =
          subLoan.repaymentType === "equal-principal" ? "等额本金" : "等额本息";
        subLoansHtml += `<div style="margin: 5px 0; padding: 4px 0;">
                                <strong>${type.name}</strong> - ${subLoan.amount}万元 <span style="color:#666;font-size:12px;">（${repayText}）</span>
                            </div>`;
      }
    });

    const item = document.createElement("div");
    item.className = "list-item";
    item.dataset.id = loan.id;
    item.innerHTML = `
                    <div class="list-item-header">
                        <div class="list-item-title">${loan.name}</div>
                        <div class="list-item-actions">
                            <button class="secondary btn-my-loan-view-schedule" data-id="${loan.id}">查看计划</button>
                            <button class="secondary btn-my-loan-edit" data-id="${loan.id}">编辑</button>
                            <button class="delete btn-my-loan-delete" data-id="${loan.id}">删除</button>
                        </div>
                    </div>
                    <div class="list-item-details">
                        <div style="margin-top: 10px;">
                            <div><strong>总金额：</strong>${loan.totalAmount}万元</div>
                            <div><strong>期限：</strong>${loan.terms}个月</div>
                            <div><strong>开始日期：</strong>${loan.startDate} <span class="badge ${statusClass}">${status}</span></div>
                            <div style="margin-top: 10px;"><strong>贷款组合：</strong>${subLoansHtml}</div>
                        </div>
                    </div>
                    <div class="item-detail-section" id="my-loan-detail-${loan.id}">
                        <!-- 详情内容将动态生成 -->
                    </div>
                `;
    myLoansList.appendChild(item);
  });

  // 默认展示第一条详情
  if (myLoans.length > 0) {
    const firstId = myLoans[0].id;
    const firstItem = document.querySelector(
      `.list-item[data-id="${firstId}"]`,
    );
    if (firstItem) firstItem.classList.add("expanded");
    toggleMyLoanDetail(firstId);
  }
}

// 切换我的贷款详情显示
function toggleMyLoanDetail(id) {
  const detailSection = document.getElementById(`my-loan-detail-${id}`);
  if (!detailSection) return;

  const isExpanded = detailSection.classList.contains("expanded");

  if (isExpanded) {
    detailSection.classList.remove("expanded");
    detailSection.innerHTML = "";
  } else {
    const loan = myLoans.find((l) => l.id === id);
    if (!loan) return;
  }
}

// 显示提示消息
function showMessage(message, type = "success") {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                    animation: slideInRight 0.3s ease;
                    max-width: 300px;
                `;

  if (type === "success") {
    messageDiv.style.background =
      "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)";
  } else if (type === "error") {
    messageDiv.style.background =
      "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)";
  } else {
    messageDiv.style.background =
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  }

  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(messageDiv);
    }, 300);
  }, 3000);
}

// 添加动画样式
const style = document.createElement("style");
style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
document.head.appendChild(style);

// 保存贷款类型
function saveLoanType() {
  const loanTypeIdInput = document.getElementById("loan-type-id");
  const typeNameInput = document.getElementById("type-name");

  if (!loanTypeIdInput || !typeNameInput) {
    showMessage("无法找到必要的表单元素", "error");
    return;
  }

  const id = loanTypeIdInput.value;
  const name = typeNameInput.value;

  // 收集利率变化
  const rateChangeItems = document.querySelectorAll(".rate-change-item");
  const rateChanges = Array.from(rateChangeItems)
    .map((item) => {
      const dateInput = item.querySelector(".change-date");
      const rateInput = item.querySelector(".change-rate");
      if (!dateInput || !rateInput) {
        console.error("利率变化项中缺少必要元素");
        return null;
      }
      return {
        date: dateInput.value,
        rate: parseFloat(rateInput.value),
      };
    })
    .filter((item) => item !== null) // 过滤无效项
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (id) {
    // 更新现有贷款类型
    const index = loanTypes.findIndex((t) => t.id === parseInt(id));
    if (index !== -1) {
      loanTypes[index] = {
        ...loanTypes[index],
        name,
        rateChanges,
      };
    }
  } else {
    // 添加新贷款类型
    loanTypes.push({
      id: currentLoanTypeId++,
      name,
      rateChanges,
    });
  }

  // 保存到本地存储并重新渲染
  localStorage.setItem("loanTypes", JSON.stringify(loanTypes));
  renderLoanTypes();
  if (loanTypeModal) loanTypeModal.style.display = "none";
  showMessage(id ? "贷款类型已更新" : "贷款类型已添加", "success");
}

// 编辑贷款类型
function editLoanType(id) {
  const type = loanTypes.find((t) => t.id === id);
  if (!type) return;

  closeAllModals();
  document.getElementById("loan-type-modal-title").textContent = "编辑贷款类型";
  const loanTypeIdInput = document.getElementById("loan-type-id");
  if (loanTypeIdInput) loanTypeIdInput.value = type.id;
  const typeNameInput = document.getElementById("type-name");
  if (typeNameInput) typeNameInput.value = type.name;
  // 渲染利率变化
  const container = document.getElementById("rate-changes-container");
  if (container) {
    container.innerHTML = "";
    if (type.rateChanges) {
      type.rateChanges.forEach((change) => {
        const item = document.createElement("div");
        item.className = "rate-change-item";
        item.innerHTML = `
                        <label>开始年月：</label>
                        <input type="month" class="change-date" value="${change.date}">
                        <label>新利率（%）：</label>
                        <input type="number" class="change-rate" step="0.01" min="0" value="${change.rate}">
                        <button type="button" class="secondary remove-rate-change">删除</button>
                    `;
        container.appendChild(item);
      });
    }
  }

  setupRateChangeEvents();
  if (loanTypeModal) loanTypeModal.style.display = "flex";
}

// 删除贷款类型
function deleteLoanType(id) {
  loanTypes = loanTypes.filter((t) => t.id !== id);
  localStorage.setItem("loanTypes", JSON.stringify(loanTypes));
  renderLoanTypes();
  showMessage("贷款类型已删除", "success");
}

// 保存我的贷款
function saveMyLoan() {
  const myLoanIdInput = document.getElementById("my-loan-id");
  const loanNameInput = document.getElementById("loan-name");
  const loanTotalAmountInput = document.getElementById("loan-total-amount");
  const loanStartDateInput = document.getElementById("loan-start-date");
  const loanTermsInput = document.getElementById("loan-terms");

  if (
    !myLoanIdInput ||
    !loanNameInput ||
    !loanTotalAmountInput ||
    !loanStartDateInput ||
    !loanTermsInput
  ) {
    console.error("无法找到必要的表单元素");
    return;
  }

  const id = myLoanIdInput.value;
  const name = loanNameInput.value;
  const totalAmount = parseFloat(loanTotalAmountInput.value);
  const startDate = loanStartDateInput.value;
  const terms = parseInt(loanTermsInput.value);

  // 收集子贷款
  const subLoanItems = document.querySelectorAll(".sub-loan-item");
  const subLoans = Array.from(subLoanItems)
    .map((item) => {
      const typeSelect = item.querySelector(".sub-loan-type");
      const repaySelect = item.querySelector(".sub-loan-repay");
      const amountInput = item.querySelector(".sub-loan-amount");
      if (!typeSelect || !amountInput || !repaySelect) {
        console.error("子贷款项中缺少必要元素");
        return null;
      }
      return {
        typeId: parseInt(typeSelect.value),
        amount: parseFloat(amountInput.value),
        repaymentType: repaySelect.value,
      };
    })
    .filter((item) => item !== null); // 过滤无效项

  // 验证总金额是否匹配
  const subTotal = subLoans.reduce((sum, loan) => sum + loan.amount, 0);
  if (Math.abs(subTotal - totalAmount) > 0.01) {
    showMessage(
      `贷款组合总金额（${subTotal.toFixed(2)}万元）与总贷款金额（${totalAmount.toFixed(2)}万元）不匹配`,
      "error",
    );
    return;
  }

  if (id) {
    // 更新现有贷款
    const index = myLoans.findIndex((l) => l.id === parseInt(id));
    if (index !== -1) {
      myLoans[index] = {
        ...myLoans[index],
        name,
        totalAmount,
        startDate,
        terms,
        subLoans,
      };
    }
  } else {
    // 添加新贷款
    myLoans.push({
      id: currentMyLoanId++,
      name,
      totalAmount,
      startDate,
      terms,
      subLoans,
    });
  }

  // 保存到本地存储并重新渲染
  localStorage.setItem("myLoans", JSON.stringify(myLoans));
  renderMyLoans();
  if (myLoanModal) myLoanModal.style.display = "none";
  showMessage(id ? "贷款已更新" : "贷款已添加", "success");
}

// 编辑我的贷款
function editMyLoan(id) {
  const loan = myLoans.find((l) => l.id === id);
  if (!loan) return;

  closeAllModals();

  // 直接通过ID获取模态框元素
  const modal = document.getElementById("my-loan-modal");
  if (!modal) {
    console.error("贷款编辑模态框不存在");
    return;
  }

  document.getElementById("my-loan-modal-title").textContent = "编辑贷款";
  const myLoanIdInput = document.getElementById("my-loan-id");
  if (myLoanIdInput) myLoanIdInput.value = loan.id;
  const loanNameInput = document.getElementById("loan-name");
  if (loanNameInput) loanNameInput.value = loan.name;
  const loanTotalAmountInput = document.getElementById("loan-total-amount");
  if (loanTotalAmountInput) loanTotalAmountInput.value = loan.totalAmount;
  const loanStartDateInput = document.getElementById("loan-start-date");
  if (loanStartDateInput) loanStartDateInput.value = loan.startDate;
  const loanTermsInput = document.getElementById("loan-terms");
  if (loanTermsInput) loanTermsInput.value = loan.terms;

  // 渲染子贷款
  const container = document.getElementById("sub-loans-container");
  if (container) {
    container.innerHTML = "";
    loan.subLoans.forEach((subLoan) => {
      const item = document.createElement("div");
      item.className = "sub-loan-item";
      item.innerHTML = `
                        <div class="form-group">
                            <label>选择贷款类型：</label>
                            <select class="sub-loan-type">
                                <!-- 贷款类型将动态加载 -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label>还款方式：</label>
                            <select class="sub-loan-repay">
                                <option value="equal-principal-interest">等额本息</option>
                                <option value="equal-principal">等额本金</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>贷款金额（万元）：</label>
                            <input type="number" class="sub-loan-amount" step="0.01" min="0.01" value="${subLoan.amount}">
                        </div>
                        <button type="button" class="secondary remove-sub-loan">删除</button>
                    `;
      container.appendChild(item);
    });

    updateSubLoanTypes();
    // 设置选中的值
    const selects = document.querySelectorAll(".sub-loan-type");
    const repaySelects = document.querySelectorAll(".sub-loan-repay");
    if (selects) {
      selects.forEach((select, index) => {
        select.value = loan.subLoans[index].typeId;
      });
    }
    if (repaySelects) {
      repaySelects.forEach((select, index) => {
        select.value =
          loan.subLoans[index].repaymentType || "equal-principal-interest";
      });
    }

    setupSubLoanEvents();
    updateSubLoanTotal();
  } else {
    console.error("子贷款容器不存在");
  }

  // 显示模态框（无论container是否存在都要显示）
  modal.style.display = "flex";
}

// 删除我的贷款
function deleteMyLoan(id) {
  myLoans = myLoans.filter((l) => l.id !== id);
  localStorage.setItem("myLoans", JSON.stringify(myLoans));
  renderMyLoans();
  showMessage("贷款已删除", "success");
}

// 查看贷款详情 - 在第三列显示
function viewLoanDetail(id) {
  const loan = myLoans.find((l) => l.id === id);
  if (!loan) return;

  const scheduleContent = document.getElementById("schedule-content");
  if (!scheduleContent) return;

  // 计算还款计划
  const schedule = calculateLoanSchedule(loan);

  // 生成详情内容 - 左侧（简化样式，不再嵌套多层容器）
  let leftHtml = `
                    <h4>基本信息</h4>
                    <p>总贷款金额：${loan.totalAmount}万元</p>
                    <p>开始还款日期：${loan.startDate}</p>
                    <p>贷款期限：${schedule.actualTerms || loan.terms}个月</p>

                    <h4 style="margin-top:12px;">贷款组合</h4>
            `;

  // 添加贷款组合信息
  loan.subLoans.forEach((subLoan) => {
    const type = loanTypes.find((t) => t.id === subLoan.typeId);
    if (type) {
      // 格式化利率变化信息
      let rateChangesHtml = "";
      if (type.rateChanges && type.rateChanges.length > 0) {
        rateChangesHtml = "<div><strong>利率变化：</strong>";
        type.rateChanges.forEach((change) => {
          rateChangesHtml += `<div>${change.date} 调整为 ${change.rate}%</div>`;
        });
        rateChangesHtml += "</div>";
      }

      leftHtml += `
                        <div style="margin:6px 0; padding:8px 0;">
                            <p><strong>${type.name}</strong> — ${subLoan.amount}万元</p>
                            <p style="color:#666;font-size:12px;">还款方式：${subLoan.repaymentType === "equal-principal-interest" ? "等额本息" : "等额本金"}</p>
                            ${rateChangesHtml}
                        </div>
                        `;
    }
  });

  leftHtml += `
                    <h4 style="margin-top:12px;">提前还款记录</h4>
                    <div id="prepayment-list">
                `;

  // 显示已有的提前还款记录
  if (loan.prepayments && loan.prepayments.length > 0) {
    loan.prepayments.forEach((prepay, index) => {
      const modeText = prepay.mode === "reduce-term" ? "缩短年限" : "降低月供";
      leftHtml += `
                            <div class="list-item" style="margin: 5px 0;">
                                <div>
                                    <strong>${prepay.date}</strong> 提前还款 <strong>${(prepay.amount / 10000).toFixed(2)}万元</strong>
                                    <span style="color: #666; font-size: 0.9em;">（${modeText}）</span>
                                </div>
                                <button type="button" class="secondary remove-prepayment" data-index="${index}" style="padding: 5px 10px; font-size: 12px;">删除</button>
                            </div>
                        `;
    });
  } else {
    leftHtml += `<p style="color: #666;">暂无提前还款记录</p>`;
  }

  leftHtml += `
                    </div>
                    <div style="margin-top: 12px; padding: 8px 0;">
                        <h5 style="margin-bottom: 10px;">添加提前还款</h5>
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="width: 120px;">还款日期：</label>
                            <input type="month" id="prepayment-date" style="width: calc(100% - 140px);" />
                        </div>
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="width: 120px;">还款金额（万元）：</label>
                            <input type="number" id="prepayment-amount" step="0.01" min="0.01" style="width: calc(100% - 140px);" />
                        </div>
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="width: 120px;">还款方式：</label>
                            <select id="prepayment-mode" style="width: calc(100% - 140px);">
                                <option value="reduce-term">缩短年限</option>
                                <option value="reduce-payment">降低月供</option>
                            </select>
                        </div>
                        <button type="button" id="add-prepayment-btn" style="margin-top: 6px;">添加提前还款</button>
                    </div>

                    <div style="margin-top: 12px;">
                        <h4>还款摘要</h4>
                        <div class="summary-item">
                            <span>总贷款金额：</span>
                            <span>${(schedule.totalPrincipal / 10000).toFixed(2)}万元</span>
                        </div>
                        <div class="summary-item">
                            <span>总利息支出：</span>
                            <span>${(schedule.totalInterest / 10000).toFixed(2)}万元</span>
                        </div>
                        <div class="summary-item">
                            <span>还款总额：</span>
                            <span>${((schedule.totalPrincipal + schedule.totalInterest) / 10000).toFixed(2)}万元</span>
                        </div>
                    </div>
                `;

  // 生成右侧还款计划表格
  let rightHtml = `
                <div style="padding: 0;">
                    <h4 style="margin-bottom: 15px;">详细还款计划</h4>
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th>期数</th>
                            <th>还款日期</th>
                            <th>月还款额（元）</th>
                            <th>还款本金（元）</th>
                            <th>还款利息（元）</th>
                                <th>提前还款（元）</th>
                            <th>剩余本金（元）</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

  // 添加还款计划
  schedule.payments.forEach((payment) => {
    const prepaymentDisplay = payment.prepayment
      ? payment.prepayment.toFixed(2)
      : "-";
    const prepaymentStyle = payment.prepayment
      ? 'style="color: #c5221f; font-weight: bold;"'
      : "";
    rightHtml += `
                    <tr>
                        <td>${payment.period}</td>
                        <td>${payment.date}</td>
                        <td>${payment.total.toFixed(2)}</td>
                        <td>${payment.principal.toFixed(2)}</td>
                        <td>${payment.interest.toFixed(2)}</td>
                        <td ${prepaymentStyle}>${prepaymentDisplay}</td>
                        <td>${payment.remainingPrincipal.toFixed(2)}</td>
                    </tr>
                `;
  });

  rightHtml += `
                    </tbody>
                </table>
                </div>
            `;

  // 构建还款计划行，一次性渲染，避免表格结构被破坏
  const rowsHtml = schedule.payments
    .map((payment) => {
      const prepaymentDisplay = payment.prepayment
        ? payment.prepayment.toFixed(2)
        : "-";
      const prepaymentStyle = payment.prepayment
        ? 'style="color: #c5221f; font-weight: bold;"'
        : "";
      return `
                            <tr>
                                <td>${payment.period}</td>
                                <td>${payment.date}</td>
                                <td>${payment.total.toFixed(2)}</td>
                                <td>${payment.principal.toFixed(2)}</td>
                                <td>${payment.interest.toFixed(2)}</td>
                                <td ${prepaymentStyle}>${prepaymentDisplay}</td>
                                <td>${payment.remainingPrincipal.toFixed(2)}</td>
                            </tr>
                        `;
    })
    .join("");

  // 在第三列显示还款计划（去掉背景和边框）
  scheduleContent.innerHTML = `
                    <div>
                        <div class="schedule-summary">
                            <h3>${loan.name}</h3>
                            <div class="summary-grid">
                                <div>
                                    <div class="summary-label">总贷款金额</div>
                                    <div class="summary-value">${(schedule.totalPrincipal / 10000).toFixed(2)} 万元</div>
                                </div>
                                <div>
                                    <div class="summary-label">总利息支出</div>
                                    <div class="summary-value">${(schedule.totalInterest / 10000).toFixed(2)} 万元</div>
                                </div>
                                <div>
                                    <div class="summary-label">还款总额</div>
                                    <div class="summary-value highlight">${((schedule.totalPrincipal + schedule.totalInterest) / 10000).toFixed(2)} 万元</div>
                                </div>
                            </div>
                        </div>
                        <div class="schedule-table-wrapper">
                            <table class="schedule-table">
                                <thead>
                                    <tr>
                                        <th class="col-period">期数</th>
                                        <th class="col-date">还款日期</th>
                                        <th class="col-money">月还款额（元）</th>
                                        <th class="col-money">还款本金（元）</th>
                                        <th class="col-money">还款利息（元）</th>
                                        <th class="col-money">提前还款（元）</th>
                                        <th class="col-money">剩余本金（元）</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

  // 设置提前还款相关事件
  setupPrepaymentEvents(id);
}

// 设置提前还款事件
function setupPrepaymentEvents(loanId) {
  // 添加提前还款按钮
  const addPrepaymentBtn = document.getElementById("add-prepayment-btn");
  if (addPrepaymentBtn) {
    addPrepaymentBtn.addEventListener("click", () => {
      const prepaymentDate = document.getElementById("prepayment-date").value;
      const prepaymentAmount = parseFloat(
        document.getElementById("prepayment-amount").value,
      );
      const prepaymentMode = document.getElementById("prepayment-mode").value;

      if (!prepaymentDate) {
        showMessage("请选择还款日期", "error");
        return;
      }

      if (!prepaymentAmount || prepaymentAmount <= 0) {
        showMessage("请输入有效的还款金额", "error");
        return;
      }

      // 添加提前还款记录
      const loan = myLoans.find((l) => l.id === loanId);
      if (!loan) return;

      if (!loan.prepayments) {
        loan.prepayments = [];
      }

      loan.prepayments.push({
        date: prepaymentDate,
        amount: prepaymentAmount * 10000, // 转换为元
        mode: prepaymentMode, // 缩短年限或降低月供
      });

      // 按日期排序
      loan.prepayments.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 保存到本地存储
      localStorage.setItem("myLoans", JSON.stringify(myLoans));

      // 重新显示还款计划
      viewLoanDetail(loanId);
      renderMyLoans(); // 重新渲染列表
      showMessage("提前还款已添加", "success");

      // 清空表单
      document.getElementById("prepayment-date").value = "";
      document.getElementById("prepayment-amount").value = "";
      document.getElementById("prepayment-mode").value = "reduce-term";
    });
  }

  // 删除提前还款按钮
  const removePrepaymentButtons =
    document.querySelectorAll(".remove-prepayment");
  if (removePrepaymentButtons) {
    removePrepaymentButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = parseInt(button.getAttribute("data-index"));
        const loan = myLoans.find((l) => l.id === loanId);
        if (!loan || !loan.prepayments) return;

        loan.prepayments.splice(index, 1);

        // 保存到本地存储
        localStorage.setItem("myLoans", JSON.stringify(myLoans));

        // 重新显示还款计划
        viewLoanDetail(loanId);
        renderMyLoans(); // 重新渲染列表
        showMessage("提前还款已删除", "success");
      });
    });
  }
}

// 计算两个日期之间的月份差
function getMonthDifference(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

// 计算贷款还款计划
function calculateLoanSchedule(loan) {
  // 转换金额为元
  const subLoans = loan.subLoans.map((sub) => {
    const type = loanTypes.find((t) => t.id === sub.typeId);
    const repaymentType = sub.repaymentType || "equal-principal-interest";
    // 基础利率取第一条利率变化
    const baseRate =
      type && type.rateChanges && type.rateChanges.length > 0
        ? type.rateChanges[0].rate
        : 0;
    return {
      ...sub,
      type,
      repaymentType,
      baseRate,
      principal: sub.amount * 10000, // 转换为元
      remainingPrincipal: sub.amount * 10000,
      originalPrincipal: sub.amount * 10000, // 保存原始本金用于等额本金计算
      currentPayment: null, // 当前月供（用于缩短年限模式）
      remainingTerms: loan.terms, // 剩余期数
    };
  });

  const payments = [];
  let totalPrincipal = 0;
  let totalInterest = 0;
  const loanStartDate = loan.startDate;

  // 获取提前还款记录，按日期排序
  const prepayments = (loan.prepayments || [])
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let prepaymentIndex = 0;

  // 计算每期还款
  for (let period = 1; period <= loan.terms; period++) {
    // 计算当前期的日期 - 修复日期计算问题
    const startDateParts = loanStartDate.split("-");
    const startYear = parseInt(startDateParts[0]);
    const startMonth = parseInt(startDateParts[1]) - 1; // 月份从0开始
    const currentDate = new Date(startYear, startMonth + period - 1, 1);
    const formattedCurrentDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

    let totalPayment = 0;
    let totalPrincipalPayment = 0;
    let totalInterestPayment = 0;
    let totalRemainingPrincipal = 0;
    let prepaymentAmount = 0;

    // 检查是否有提前还款
    let currentPrepayment = null;
    if (prepaymentIndex < prepayments.length) {
      const prepayment = prepayments[prepaymentIndex];
      if (prepayment.date === formattedCurrentDate) {
        prepaymentAmount = prepayment.amount;
        currentPrepayment = prepayment;
        prepaymentIndex++;
      }
    }

    // 计算每个子贷款的当期还款
    subLoans.forEach((subLoan) => {
      if (subLoan.remainingPrincipal <= 0) return;

      // 获取当前利率 - 根据日期判断适用的利率
      let currentRate = subLoan.baseRate || 0;

      // 查找适用的利率变化（首条为初始，后续生效为次月）
      if (subLoan.type && subLoan.type.rateChanges) {
        for (let i = subLoan.type.rateChanges.length - 1; i >= 0; i--) {
          const change = subLoan.type.rateChanges[i];
          const changeDate = new Date(change.date + "-01");
          changeDate.setMonth(changeDate.getMonth() + 1);
          const effectiveDate = `${changeDate.getFullYear()}-${String(changeDate.getMonth() + 1).padStart(2, "0")}`;

          if (new Date(effectiveDate) <= new Date(formattedCurrentDate)) {
            currentRate = change.rate;
            break;
          }
        }
      }

      const monthlyRate = currentRate / 100 / 12;

      let principalPayment, interestPayment, payment;

      // 计算当前所有子贷款的总剩余本金，用于按比例分配提前还款
      const totalRemaining = subLoans.reduce(
        (sum, sl) =>
          sum + (sl.remainingPrincipal > 0 ? sl.remainingPrincipal : 0),
        0,
      );
      const subLoanRatio =
        totalRemaining > 0 ? subLoan.remainingPrincipal / totalRemaining : 0;
      const subLoanPrepayment = prepaymentAmount * subLoanRatio;

      if (subLoan.repaymentType === "equal-principal-interest") {
        // 等额本息
        let effectivePrincipal = subLoan.remainingPrincipal;
        let effectiveRemainingTerms =
          subLoan.remainingTerms || loan.terms - period + 1;

        // 如果是第一次计算，初始化月供
        if (
          !subLoan.currentPayment &&
          effectivePrincipal > 0 &&
          effectiveRemainingTerms > 0
        ) {
          subLoan.currentPayment =
            (effectivePrincipal *
              monthlyRate *
              Math.pow(1 + monthlyRate, effectiveRemainingTerms)) /
            (Math.pow(1 + monthlyRate, effectiveRemainingTerms) - 1);
        }

        if (subLoanPrepayment > 0 && currentPrepayment) {
          // 应用提前还款到本金
          effectivePrincipal -= subLoanPrepayment;
          if (effectivePrincipal < 0) effectivePrincipal = 0;

          // 根据提前还款模式调整
          if (currentPrepayment.mode === "reduce-term") {
            // 缩短年限：保持月供不变，减少期数
            if (
              effectivePrincipal > 0 &&
              monthlyRate > 0 &&
              subLoan.currentPayment
            ) {
              // 使用当前月供反推剩余期数
              const payment = subLoan.currentPayment;
              if (payment > effectivePrincipal * monthlyRate) {
                // 计算新的剩余期数
                effectiveRemainingTerms = Math.ceil(
                  -Math.log(1 - (effectivePrincipal * monthlyRate) / payment) /
                    Math.log(1 + monthlyRate),
                );
                if (effectiveRemainingTerms < 1) effectiveRemainingTerms = 1;
              }
            }
          } else {
            // 降低月供：保持期数不变，重新计算月供
            effectiveRemainingTerms =
              subLoan.remainingTerms || loan.terms - period + 1;
            if (effectivePrincipal > 0 && effectiveRemainingTerms > 0) {
              subLoan.currentPayment =
                (effectivePrincipal *
                  monthlyRate *
                  Math.pow(1 + monthlyRate, effectiveRemainingTerms)) /
                (Math.pow(1 + monthlyRate, effectiveRemainingTerms) - 1);
            }
          }

          // 更新剩余期数
          subLoan.remainingTerms = effectiveRemainingTerms;
        }

        if (effectivePrincipal > 0 && effectiveRemainingTerms > 0) {
          payment =
            subLoan.currentPayment ||
            (effectivePrincipal *
              monthlyRate *
              Math.pow(1 + monthlyRate, effectiveRemainingTerms)) /
              (Math.pow(1 + monthlyRate, effectiveRemainingTerms) - 1);
          interestPayment = effectivePrincipal * monthlyRate;
          principalPayment = payment - interestPayment;

          // 如果有提前还款，加到本金还款中
          if (subLoanPrepayment > 0) {
            principalPayment += subLoanPrepayment;
            payment += subLoanPrepayment;
          }
        } else {
          // 如果提前还款后本金为0，只还剩余部分
          interestPayment = subLoan.remainingPrincipal * monthlyRate;
          principalPayment = subLoan.remainingPrincipal;
          payment = principalPayment + interestPayment;
        }

        // 更新剩余期数
        subLoan.remainingTerms =
          (subLoan.remainingTerms || effectiveRemainingTerms) - 1;
      } else {
        // 等额本金
        // 计算剩余期数（考虑提前还款可能提前结束贷款）
        const remainingTerms = Math.max(
          1,
          Math.ceil(
            subLoan.remainingPrincipal /
              (subLoan.originalPrincipal / loan.terms),
          ),
        );
        const monthlyPrincipal = subLoan.remainingPrincipal / remainingTerms;
        interestPayment = subLoan.remainingPrincipal * monthlyRate;
        principalPayment = monthlyPrincipal;

        // 如果有提前还款，加到本金还款中
        if (subLoanPrepayment > 0) {
          principalPayment += subLoanPrepayment;
        }

        payment = principalPayment + interestPayment;
      }

      // 确保最后一期还款正确
      if (
        period === loan.terms ||
        subLoan.remainingPrincipal < principalPayment
      ) {
        principalPayment = subLoan.remainingPrincipal;
        payment = principalPayment + interestPayment;
      }

      // 更新剩余本金
      subLoan.remainingPrincipal -= principalPayment;
      if (subLoan.remainingPrincipal < 0) {
        subLoan.remainingPrincipal = 0;
      }

      // 累加总额
      totalPayment += payment;
      totalPrincipalPayment += principalPayment;
      totalInterestPayment += interestPayment;
      totalRemainingPrincipal += subLoan.remainingPrincipal;
    });

    // 如果所有贷款都已还清，提前结束
    if (totalRemainingPrincipal <= 0.01) {
      payments.push({
        period,
        date: formattedCurrentDate,
        total: totalPayment,
        principal: totalPrincipalPayment,
        interest: totalInterestPayment,
        remainingPrincipal: 0,
        prepayment: prepaymentAmount > 0 ? prepaymentAmount : undefined,
      });
      totalPrincipal += totalPrincipalPayment;
      totalInterest += totalInterestPayment;
      break;
    }

    // 检查是否所有子贷款的剩余期数都已用完（缩短年限模式）
    const allTermsUsed = subLoans.every(
      (sl) =>
        sl.remainingPrincipal <= 0 ||
        (sl.remainingTerms !== undefined && sl.remainingTerms <= 0),
    );
    if (allTermsUsed && totalRemainingPrincipal > 0.01) {
      // 如果期数用完但还有本金，在下一期还清
      continue;
    }

    payments.push({
      period,
      date: formattedCurrentDate,
      total: totalPayment,
      principal: totalPrincipalPayment,
      interest: totalInterestPayment,
      remainingPrincipal: totalRemainingPrincipal,
      prepayment: prepaymentAmount > 0 ? prepaymentAmount : undefined,
    });

    totalPrincipal += totalPrincipalPayment;
    totalInterest += totalInterestPayment;
  }

  return {
    payments,
    totalPrincipal,
    totalInterest,
    actualTerms: payments.length, // 实际还款期数
  };
}

// 切换贷款类型展开/收起
function toggleLoanType(id) {
  const item = document.querySelector(`.list-item[data-id="${id}"]`);
  if (item) {
    item.classList.toggle("expanded");
  }
}

// 切换我的贷款展开/收起
function toggleMyLoan(id) {
  const item = document.querySelector(`.list-item[data-id="${id}"]`);
  if (item) {
    item.classList.toggle("expanded");
  }
}

// 辅助函数：获取当前月份
function getCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
