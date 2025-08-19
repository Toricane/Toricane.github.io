// AI functions
function shuffle(array) {
    var random = array.map(Math.random);
    array.sort(function (a, b) {
        return random[a] - random[b];
    });
}
const deepcopy = (items) =>
    items.map((item) => (Array.isArray(item) ? deepcopy(item) : item));

function move_is_valid(board, move) {
    if (move < 1 || move > board.length) {
        return false;
    }
    if (board[move - 1][0] != " ") {
        return false;
    }
    return true;
}

function select_space(board, column, player) {
    if (!move_is_valid(board, column)) {
        return false;
    }
    if (player != "X" && player != "O") {
        return false;
    }
    for (let y = board.length - 1; y > -1; y--) {
        if (board[column - 1][y] === " ") {
            board[column - 1][y] = player;
            return true;
        }
    }
    return false;
}

function board_is_full(board) {
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[1].length; y++) {
            if (board[x][y] === " ") {
                return false;
            }
        }
    }
    return true;
}

function available_moves(board) {
    moves = [];
    for (let i = 1; i < board.length + 1; i++) {
        if (move_is_valid(board, i)) {
            moves.push(i);
        }
    }
    return moves;
}

function has_won(board, symbol, which = false) {
    // check - spaces
    for (let y = 0; y < board[0].length; y++) {
        for (let x = 0; x < board.length - 3; x++) {
            if (
                board[x][y] === symbol &&
                board[x + 1][y] === symbol &&
                board[x + 2][y] === symbol &&
                board[x + 3][y] === symbol
            ) {
                if (which) {
                    return [
                        [x, y],
                        [x + 1, y],
                        [x + 2, y],
                        [x + 3, y],
                    ];
                }
                return true;
            }
        }
    }
    // check | spaces
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[0].length - 3; y++) {
            if (
                board[x][y] === symbol &&
                board[x][y + 1] === symbol &&
                board[x][y + 2] === symbol &&
                board[x][y + 3] === symbol
            ) {
                if (which) {
                    return [
                        [x, y],
                        [x, y + 1],
                        [x, y + 2],
                        [x, y + 3],
                    ];
                }
                return true;
            }
        }
    }
    // check / spaces
    for (let x = 0; x < board.length - 3; x++) {
        for (let y = 3; y < board[0].length; y++) {
            if (
                board[x][y] === symbol &&
                board[x + 1][y - 1] === symbol &&
                board[x + 2][y - 2] === symbol &&
                board[x + 3][y - 3] === symbol
            ) {
                if (which) {
                    return [
                        [x, y],
                        [x + 1, y - 1],
                        [x + 2, y - 2],
                        [x + 3, y - 3],
                    ];
                }
                return true;
            }
        }
    }
    // check \ spaces
    for (let x = 0; x < board.length - 3; x++) {
        for (let y = 0; y < board[0].length - 3; y++) {
            if (
                board[x][y] === symbol &&
                board[x + 1][y + 1] === symbol &&
                board[x + 2][y + 2] === symbol &&
                board[x + 3][y + 3] === symbol
            ) {
                if (which) {
                    return [
                        [x, y],
                        [x + 1, y + 1],
                        [x + 2, y + 2],
                        [x + 3, y + 3],
                    ];
                }
                return true;
            }
        }
    }
    return false;
}

function game_is_over(board) {
    return (
        has_won(board, "X") ||
        has_won(board, "O") ||
        available_moves(board).length === 0
    );
}

function evaluate_board(board) {
    if (has_won(board, "X")) {
        return Number.MAX_SAFE_INTEGER;
    } else if (has_won(board, "O")) {
        return Number.MIN_SAFE_INTEGER;
    } else {
        const num_all_x = score(board, "X");
        const num_all_o = score(board, "O");
        return num_all_x - num_all_o;
    }
}

function evaluateSequence(sequence, player) {
    let filled = 0;
    let openEnds = 0;

    for (let i = 0; i < 4; i++) {
        if (sequence[i] === player) {
            filled++;
        } else if (sequence[i] === " ") {
            openEnds++;
        } else {
            break;
        }
    }

    for (let i = 3; i >= 0; i--) {
        if (sequence[i] === player) {
            filled++;
        } else if (sequence[i] === " ") {
            openEnds++;
        } else {
            break;
        }
    }

    if (filled === 4) {
        return 4 ** 4;
    } else if (filled === 3 && openEnds === 1) {
        return 3 ** 3;
    } else if (filled === 2 && openEnds === 2) {
        return 2 ** 2;
    } else {
        return 1;
    }
}

function score(board, player) {
    let totalScore = 0;

    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            let sequence = [];
            if (col <= 3) {
                // Check horizontal sequence to the right
                for (let i = col; i < col + 4; i++) {
                    sequence.push(board[i][row]);
                }
                totalScore += evaluateSequence(sequence, player);

                // Check diagonal down-right
                if (row <= 2) {
                    sequence = [];
                    for (let i = 0; i < 4; i++) {
                        sequence.push(board[col + i][row + i]);
                    }
                    totalScore += evaluateSequence(sequence, player);
                }

                // Check diagonal up-right
                if (row >= 3) {
                    sequence = [];
                    for (let i = 0; i < 4; i++) {
                        sequence.push(board[col + i][row - i]);
                    }
                    totalScore += evaluateSequence(sequence, player);
                }
            }

            if (row <= 2) {
                // Check vertical sequence
                sequence = [];
                for (let i = row; i < row + 4; i++) {
                    sequence.push(board[col][i]);
                }
                totalScore += evaluateSequence(sequence, player);

                // Check diagonal down-left
                if (col >= 3) {
                    sequence = [];
                    for (let i = 0; i < 4; i++) {
                        sequence.push(board[col - i][row + i]);
                    }
                    totalScore += evaluateSequence(sequence, player);
                }
            }
        }
    }
    let num_player = 0;
    for (let slot of board[3]) {
        if (slot === player) {
            num_player += 1;
        }
    }
    totalScore += num_player;

    return totalScore;
}

function minimax(input_board, is_maximizing, depth, alpha, beta) {
    if (game_is_over(input_board) || depth === 0) {
        return [evaluate_board(input_board), ""];
    }
    let moves = available_moves(input_board);
    moves = sort_moves(moves, input_board, is_maximizing);
    let best_move = moves[0];
    if (is_maximizing) {
        let best_value = Number.MIN_SAFE_INTEGER;
        for (const move of moves) {
            let new_board = deepcopy(input_board);
            select_space(new_board, move, "X");
            const hypothetical_value = minimax(
                new_board,
                false,
                depth - 1,
                alpha,
                beta
            )[0];
            if (hypothetical_value > best_value) {
                best_value = hypothetical_value;
                best_move = move;
            }
            alpha = Math.max(alpha, best_value);
            if (alpha >= beta) {
                break;
            }
        }
        return [best_value, best_move];
    } else {
        let best_value = Number.MAX_SAFE_INTEGER;
        for (const move of moves) {
            let new_board = deepcopy(input_board);
            select_space(new_board, move, "O");
            const hypothetical_value = minimax(
                new_board,
                true,
                depth - 1,
                alpha,
                beta
            )[0];
            if (hypothetical_value < best_value) {
                best_value = hypothetical_value;
                best_move = move;
            }
            beta = Math.min(beta, best_value);
            if (alpha >= beta) {
                break;
            }
        }
        return [best_value, best_move];
    }
}

function sort_moves(moves, input_board, is_maximizing) {
    let values = [];
    for (const move of moves) {
        let new_board = deepcopy(input_board);
        select_space(new_board, move, is_maximizing ? "X" : "O");
        const hypothetical_value = evaluate_board(new_board);
        values.push([hypothetical_value, move]);
    }
    values.sort((a, b) => (is_maximizing ? b[0] - a[0] : a[0] - b[0]));
    return values.map((val) => val[1]);
}

function generate_board() {
    let _board = [];
    let row;
    for (let i = 0; i < 7; i++) {
        row = [];
        for (let j = 0; j < 6; j++) {
            row.push(" ");
        }
        _board.push(row);
    }
    return _board;
}

function syncBoard() {
    document.getElementById("notif-D").hidden = true;
    const turnElement = document.getElementById("turn");
    const notifElement = document.getElementById(`notif-${turn}`);
    const notifElement2 = document.getElementById(
        `notif-${turn === "X" ? "O" : "X"}`
    );
    notifElement.hidden = false;
    notifElement2.hidden = true;
    if (turn === "X") {
        turnElement.innerHTML = `<span class='span_red'>${
            ai === "X" ? "AI's" : ai ? "Your" : "Red's"
        } Turn</span>`;
    } else if (turn === "O") {
        turnElement.innerHTML = `<span class='span_yellow'>${
            ai === "O" ? "AI's" : ai ? "Your" : "Yellow's"
        } Turn</span>`;
    } else {
        turnElement.innerHTML = "";
    }
    const table = document.getElementById("board");
    table.innerHTML = "";

    for (let y = 0; y < board[0].length; y++) {
        const row = document.createElement("tr");
        for (let x = 0; x < board.length; x++) {
            const cell = document.createElement("td");
            cell.setAttribute("id", `${x},${y}`);
            cell.setAttribute("onclick", "dropPiece(this.id)");
            if (board[x][y] === "X") {
                cell.className = "cell red";
            } else if (board[x][y] === "O") {
                cell.className = "cell yellow";
            }
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    if (has_won(board, "X") || has_won(board, "O")) {
        const turnElement = document.getElementById("turn");
        const notifElement = document.getElementById(`notif-${turn}`);
        const notifElement2 = document.getElementById(
            `notif-${turn === "X" ? "O" : "X"}`
        );
        notifElement.hidden = true;
        notifElement2.hidden = false;

        let coords;
        if (turn === "X") {
            turnElement.innerHTML =
                "<span class='span_yellow'>Yellow Wins!</span>";
            coords = has_won(board, "O", true);
        } else {
            turnElement.innerHTML = "<span class='span_red'>Red Wins!</span>";
            coords = has_won(board, "X", true);
        }
        for (let i = 0; i < coords.length; i++) {
            const cell = document.getElementById(
                `${coords[i][0]},${coords[i][1]}`
            );
            cell.className = `cell win_${turn === "X" ? "yellow" : "red"}`;
        }
    } else if (game_is_over(board)) {
        const turnElement = document.getElementById("turn");
        turnElement.innerHTML = "<span>Draw!</span>";
        notifElement.hidden = true;
        notifElement2.hidden = true;
        document.getElementById("notif-D").hidden = false;
    }
    document.querySelectorAll("td").forEach((cell) => {
        cell.addEventListener("mouseenter", function () {
            const column = this.id.split(",")[0];
            const cellsInColumn = document.querySelectorAll(
                `td[id^="${column},"]`
            );
            if (cellsInColumn[0].classList.length) return;
            let bottomCell = cellsInColumn[cellsInColumn.length - 1];
            while (bottomCell.classList.length > 0) {
                bottomCell = cellsInColumn[bottomCell.id.split(",")[1] - 1];
            }
            bottomCell.style.backgroundColor = "rgb(174, 214, 241)";
        });
        cell.addEventListener("mouseleave", function () {
            const column = this.id.split(",")[0];
            const cellsInColumn = document.querySelectorAll(
                `td[id^="${column},"]`
            );
            if (cellsInColumn[0].classList.length) return;
            let bottomCell = cellsInColumn[cellsInColumn.length - 1];
            while (bottomCell.classList.length > 0) {
                bottomCell = cellsInColumn[bottomCell.id.split(",")[1] - 1];
            }
            bottomCell.style.backgroundColor = "";
        });
    });
}

let turn = "X";

function dropPiece(id, pl = true) {
    if ((ai && turn === ai && pl) || game_is_over(board)) return;
    let col;
    if (typeof id === "string") {
        col = parseInt(id.split(",")[0]);
    } else {
        col = id;
    }
    if (!pl) {
        col -= 1;
    }
    const res = place(turn, col + 1);
    if (!res) return;
    if (turn === "X") {
        turn = "O";
    } else {
        turn = "X";
    }
    syncBoard();
    document.getElementById(res).className = `win_${
        turn === "X" ? "yellow" : "red"
    }`;
    setTimeout(() => {
        handleGameLogic();
    }, 1);
}

function place(player, column) {
    column = parseInt(column);
    if (!move_is_valid(board, column)) {
        return false;
    }
    if (player !== "X" && player !== "O") {
        return false;
    }
    for (let y = board[0].length - 1; y >= 0; y--) {
        if (board[column - 1][y] === " ") {
            board[column - 1][y] = player;
            return `${column - 1},${y}`;
        }
    }
    return false;
}

let board = generate_board();
let ai = "";

syncBoard();

function getRandomInt() {
    return Math.round(Math.random());
}

function handleGameLogic() {
    if (!game_is_over(board)) {
        if (ai === turn) {
            const ai_level = parseInt(
                document.getElementById("ai-level").value
            );
            let col = parseInt(
                minimax(
                    board,
                    ai === "X",
                    ai_level,
                    Number.MIN_SAFE_INTEGER,
                    Number.MAX_SAFE_INTEGER
                )[1]
            );
            dropPiece(col, false);
        }
    } else if (has_won(board, "X") || has_won(board, "O")) {
        const turnElement = document.getElementById("turn");
        if (turn === "X") {
            turnElement.innerHTML =
                "<span class='span_yellow'>Yellow Wins!</span>";
        } else {
            turnElement.innerHTML = "<span class='span_red'>Red Wins!</span>";
        }
    } else {
        const turnElement = document.getElementById("turn");
        turnElement.innerHTML = "<span>Draw!</span>";
    }
}

function startAIGame() {
    board = generate_board();
    // syncBoard();
    turn = "X";
    const whoFirst = document.getElementById("who-first").value;
    if (whoFirst === "random") {
        if (getRandomInt() === 1) {
            ai = "X";
        } else {
            ai = "O";
        }
    } else if (whoFirst === "ai") {
        ai = "X";
    } else {
        ai = "O";
    }
    syncBoard();
    setTimeout(() => {
        handleGameLogic();
    }, 1);
}

function resetBoard() {
    board = generate_board();
    turn = "X";
    ai = "";
    syncBoard();
}
