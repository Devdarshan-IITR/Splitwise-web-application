// Data storage
let friends = [];
let expenses = [];

// Add a new friend
function addFriend() {
    const nameInput = document.getElementById('friendName');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a name!');
        return;
    }

    if (friends.includes(name)) {
        alert('This friend is already added');
        return;
    }

    friends.push(name);
    nameInput.value = '';
    updateFriendsDisplay();
    updatePaidByDropdown();
    updateSplitCheckboxes();
    updateCustomAmounts();
}

// Remove a friend
function removeFriend(name) {
    if (confirm(`Remove ${name}? All their expenses will be deleted too.`)) {
        friends = friends.filter(f => f !== name);
        expenses = expenses.filter(e => e.paidBy !== name && e.splitAmong.includes(name) === false);
        updateFriendsDisplay();
        updatePaidByDropdown();
        updateSplitCheckboxes();
        updateCustomAmounts();
        updateExpensesDisplay();
        updateBalances();
        document.getElementById('settlementList').innerHTML = '<div class="empty-state">Click "Calculate" to see who needs to pay whom</div>';
    }
}

// Update friends display
function updateFriendsDisplay() {
    const container = document.getElementById('friendsList');
    if (friends.length === 0) {
        container.innerHTML = '<span style="color: #999;">No friends added yet</span>';
        return;
    }
    container.innerHTML = friends.map(name => 
        `<span class="friend-tag">${name} <span class="remove" onclick="removeFriend('${name}')">×</span></span>`
    ).join('');
}

// Update "Paid By" dropdown
function updatePaidByDropdown() {
    const select = document.getElementById('paidBy');
    select.innerHTML = '<option value="">Select who paid</option>' + 
        friends.map(name => `<option value="${name}">${name}</option>`).join('');
}

// Update split checkboxes
function updateSplitCheckboxes() {
    const container = document.getElementById('splitAmongCheckboxes');
    container.innerHTML = friends.map(name => 
        `<label><input type="checkbox" value="${name}" checked> ${name}</label>`
    ).join('');
}

// Update custom amounts inputs
function updateCustomAmounts() {
    const container = document.getElementById('customAmounts');
    container.innerHTML = friends.map(name => `
        <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-weight: normal;">${name}: ₹</label>
            <input type="number" id="custom-${name}" placeholder="0" min="0" step="0.01" style="width: 150px; display: inline-block;">
        </div>
    `).join('');
}

// Toggle split options
function toggleSplitOptions() {
    const splitType = document.querySelector('input[name="splitType"]:checked').value;
    document.getElementById('equalSplitSection').style.display = splitType === 'equal' ? 'block' : 'none';
    document.getElementById('customSplitSection').style.display = splitType === 'custom' ? 'block' : 'none';
}

// Add an expense
function addExpense() {
    const desc = document.getElementById('expenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const paidBy = document.getElementById('paidBy').value;
    const splitType = document.querySelector('input[name="splitType"]:checked').value;

    if (!desc || isNaN(amount) || amount <= 0 || !paidBy) {
        alert('Please fill all fields correctly!');
        return;
    }

    let splitAmong = [];
    let splitAmounts = {};

    if (splitType === 'equal') {
        const checkboxes = document.querySelectorAll('#splitAmongCheckboxes input[type="checkbox"]:checked');
        checkboxes.forEach(cb => splitAmong.push(cb.value));

        if (splitAmong.length === 0) {
            alert('Select at least one friend to split with!');
            return;
        }

        const splitAmount = amount / splitAmong.length;
        splitAmong.forEach(name => {
            splitAmounts[name] = splitAmount;
        });
    } else {
        let totalCustom = 0;
        friends.forEach(name => {
            const val = parseFloat(document.getElementById(`custom-${name}`).value) || 0;
            if (val > 0) {
                splitAmong.push(name);
                splitAmounts[name] = val;
                totalCustom += val;
            }
        });

        if (splitAmong.length === 0) {
            alert('Enter amounts for at least one friend!');
            return;
        }

        if (Math.abs(totalCustom - amount) > 0.01) {
            alert(`Custom amounts total (₹${totalCustom.toFixed(2)}) must equal the expense amount (₹${amount.toFixed(2)})!`);
            return;
        }
    }

    const expense = {
        id: Date.now(),
        desc,
        amount,
        paidBy,
        splitAmong,
        splitAmounts,
        date: new Date().toLocaleDateString()
    };

    expenses.push(expense);

    // Clear inputs
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('paidBy').value = '';
    if (splitType === 'custom') {
        friends.forEach(name => {
            document.getElementById(`custom-${name}`).value = '';
        });
    }

    updateExpensesDisplay();
    updateBalances();
    document.getElementById('settlementList').innerHTML = '<div class="empty-state">Click "Calculate" to see who needs to pay whom</div>';
}

// Delete an expense
function deleteExpense(id) {
    if (confirm('Delete this expense?')) {
        expenses = expenses.filter(e => e.id !== id);
        updateExpensesDisplay();
        updateBalances();
        document.getElementById('settlementList').innerHTML = '<div class="empty-state">Click "Calculate" to see who needs to pay whom</div>';
    }
}

// Update expenses display
function updateExpensesDisplay() {
    const container = document.getElementById('expensesList');
    if (expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">No expenses added yet. Add your first expense above!</div>';
        return;
    }

    container.innerHTML = expenses.map(exp => {
        const splitDetails = exp.splitAmong.map(name => 
            `${name}: ₹${exp.splitAmounts[name].toFixed(2)}`
        ).join(', ');

        return `
            <div class="expense-item">
                <div class="details">
                    <strong>${exp.desc}</strong>
                    <small>Paid by: ${exp.paidBy} | ${exp.date} | Split: ${splitDetails}</small>
                </div>
                <div style="display: flex; align-items: center;">
                    <div class="amount">₹${exp.amount.toFixed(2)}</div>
                    <button class="btn btn-danger" onclick="deleteExpense(${exp.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Calculate and display balances
function updateBalances() {
    const container = document.getElementById('balancesList');
    if (friends.length === 0 || expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">Add friends and expenses to see balances</div>';
        return;
    }

    const balances = {};
    friends.forEach(name => balances[name] = 0);

    expenses.forEach(exp => {
        // Person who paid gets credit
        balances[exp.paidBy] += exp.amount;
        // Others get debit for their share
        exp.splitAmong.forEach(name => {
            balances[name] -= exp.splitAmounts[name];
        });
    });

    let html = '';
    friends.forEach(name => {
        const balance = balances[name];
        let className, text;
        if (balance > 0.01) {
            className = 'balance-positive';
            text = `gets back ₹${balance.toFixed(2)}`;
        } else if (balance < -0.01) {
            className = 'balance-negative';
            text = `owes ₹${Math.abs(balance).toFixed(2)}`;
        } else {
            className = 'balance-neutral';
            text = 'all settled up';
        }
        html += `<div style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 6px;">
            <strong>${name}</strong>: <span class="${className}">${text}</span>
        </div>`;
    });

    container.innerHTML = html;
}

// Calculate settlement (who pays whom)
function calculateSettlement() {
    const container = document.getElementById('settlementList');
    if (friends.length === 0 || expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">Add friends and expenses first!</div>';
        return;
    }

    const balances = {};
    friends.forEach(name => balances[name] = 0);

    expenses.forEach(exp => {
        balances[exp.paidBy] += exp.amount;
        exp.splitAmong.forEach(name => {
            balances[name] -= exp.splitAmounts[name];
        });
    });

    // Separate creditors and debtors
    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([name, balance]) => {
        if (balance > 0.01) creditors.push({ name, amount: balance });
        else if (balance < -0.01) debtors.push({ name, amount: -balance });
    });

    if (creditors.length === 0 && debtors.length === 0) {
        container.innerHTML = '<div class="empty-state"> Everyone is settled up! No payments needed.</div>';
        return;
    }

    // Sort by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amount = Math.min(debtor.amount, creditor.amount);

        if (amount > 0.01) {
            settlements.push({
                from: debtor.name,
                to: creditor.name,
                amount: amount
            });
        }

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    if (settlements.length === 0) {
        container.innerHTML = '<div class="empty-state">🎉 Everyone is settled up!</div>';
        return;
    }

    container.innerHTML = settlements.map(s => `
        <div class="settlement-item">
            <span class="payer">${s.from}</span> pays 
            <span class="receiver">${s.to}</span>: 
            <span class="amount">₹${s.amount.toFixed(2)}</span>
        </div>
    `).join('');
}

// Initialize
updateFriendsDisplay();
updatePaidByDropdown();
updateSplitCheckboxes();