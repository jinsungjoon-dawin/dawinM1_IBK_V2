<script>
    import { rooturl, t } from "../aqtstore";
    import * as XLSX from "xlsx";
    import { onMount } from "svelte";

    let selectedRow = 0;
    let fileInput; // 파일 input 요소 참조
    let searchtxt = "";
    let currentPage = 1;
    let itemsPerPage = 15;
    let list = [];

    // 테이블 헤더 정의
    const tableHeader = [
        " ",
        "이관ID",
        "DB명",
        "DB계정",
        "Table(Asis)",
        "Table(Tobe)",
        "Index(Asis)",
        "Index(Tobe)",
        "Obj(Asis)",
        "Obj(Tobe)",
        "Invalid(Asis)",
        "Invalid(Tobe)",
        "검증대상",
        "오류건수",
    ];

    function triggerFileUpload() {
        fileInput.click(); // 버튼 클릭 시 input 클릭 이벤트 발생
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = jsonData[0];

            // Header Mapping
            const headerMap = {
                이관ID: "did",
                DB명: "dbname",
                DB계정: "dbuser",
                "Table(Asis)": "tblAsis",
                "Table(Tobe)": "tblTobe",
                "Index(Asis)": "idxAsis",
                "Index(Tobe)": "idxTobe",
                "Obj(Asis)": "objAsis",
                "Obj(Tobe)": "objTobe",
                "Invalid(Asis)": "invalidAsis",
                "Invalid(Tobe)": "invalidTobe",
                검증대상: "checkTbl",
                오류건수: "checkErr",
            };

            const rows = jsonData.slice(1).map((row) => {
                let obj = {};
                headers.forEach((key, i) => {
                    const mappedKey = headerMap[key] || key;
                    obj[mappedKey] = row[i] || "";
                });
                const merged = {};
                // 기본값 설정
                const cols = {
                    checked: true,
                    pkey: 0,
                    did: 0,
                    dbname: "",
                    dbuser: "",
                    tblAsis: 0,
                    tblTobe: 0,
                    idxAsis: 0,
                    idxTobe: 0,
                    objAsis: 0,
                    objTobe: 0,
                    invalidAsis: 0,
                    invalidTobe: 0,
                    checkTbl: 0,
                    checkErr: 0,
                    flag: "new",
                };

                const keys = new Set([
                    ...Object.keys(obj),
                    ...Object.keys(cols),
                ]);
                keys.forEach((key) => {
                    merged[key] = obj[key] || cols[key];
                });
                return merged;
            });

            rows.reverse();
            rows.forEach((item) => {
                list = [item, ...list];
            });
        };
        reader.readAsArrayBuffer(file);
    }

    const handleRowClick = (idx) => {
        selectedRow = idx;
        currentPage = 1;
    };

    $: paginatedlist = list.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );
    $: totalPages = Math.ceil(list.length / itemsPerPage);

    let selectAll = false;

    function toggleAll() {
        list = list.map((item) => ({ ...item, checked: selectAll }));
    }

    function goToPage(page) {
        if (page > 0 && page <= totalPages) {
            currentPage = page;
        }
    }

    // 추가
    function addRow() {
        const newRow = {
            checked: true,
            pkey: 0,
            did: 0,
            dbname: "",
            dbuser: "",
            tblAsis: 0,
            tblTobe: 0,
            idxAsis: 0,
            idxTobe: 0,
            objAsis: 0,
            objTobe: 0,
            invalidAsis: 0,
            invalidTobe: 0,
            checkTbl: 0,
            checkErr: 0,
            flag: "new",
        };
        list = [newRow, ...list];
    }

    function checkData() {
        const saveList = list.filter((item) => item.checked);
        if (saveList.length == 0) {
            alert("선택된 데이터가 없습니다.");
            return false;
        }
        return true;
    }

    // 조회
    async function searchData() {
        let serviceUrl = $rooturl + "/dataManagement?searchtxt=" + searchtxt;
        const res = await fetch(serviceUrl);
        if (res.ok) {
            list = await res.json();
            list = list.map((item) => ({
                ...item,
                checked: false,
                flag: "old",
            }));
        } else {
            alert("조회 실패: " + res.statusText);
        }
    }

    // 삭제
    function deleteData() {
        if (!checkData()) return;
        if (!confirm("삭제하시겠습니까?")) return;

        const saveList = list.filter((item) => item.checked);
        let serviceUrl = $rooturl + "/dataManagement/del";

        fetch(serviceUrl, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saveList),
        })
            .then(async (res) => {
                let rmsg = await res.json();
                if (res.status == 200 && rmsg.rdata === 1) {
                    alert("삭제 완료하였습니다.");
                    searchData();
                } else {
                    alert("삭제 실패하였습니다.");
                }
            })
            .catch((err) => {
                alert("error:" + err.message);
            });
    }

    // 저장
    function saveData() {
        if (!checkData()) return;
        if (!confirm("저장하시겠습니까?")) return;

        const saveList = list.filter((item) => item.checked);
        let serviceUrl = $rooturl + "/dataManagement/save";

        fetch(serviceUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saveList),
        })
            .then(async (res) => {
                let rmsg = await res.json();
                if (res.status == 200 && rmsg.rdata === 1) {
                    alert("저장 완료하였습니다.");
                    searchData();
                } else {
                    if (rmsg.error === "DID_NOT_FOUND") {
                        alert(
                            "이관ID(DID)가 존재하지 않습니다. 먼저 등록해주세요.",
                        );
                    } else {
                        alert("저장 실패하였습니다.");
                    }
                }
            })
            .catch((err) => {
                alert("error:" + err.message);
            });
    }

    // 엑셀 다운로드
    function downloadExcel() {
        if (list.length === 0) {
            alert("다운로드할 데이터가 없습니다.");
            return;
        }

        const headers = tableHeader.slice(1); // 첫 번째 체크박스 컬럼 제외
        const headerMap = {
            이관ID: "did",
            DB명: "dbname",
            DB계정: "dbuser",
            "Table(Asis)": "tblAsis",
            "Table(Tobe)": "tblTobe",
            "Index(Asis)": "idxAsis",
            "Index(Tobe)": "idxTobe",
            "Obj(Asis)": "objAsis",
            "Obj(Tobe)": "objTobe",
            "Invalid(Asis)": "invalidAsis",
            "Invalid(Tobe)": "invalidTobe",
            검증대상: "checkTbl",
            오류건수: "checkErr",
        };

        const excelData = list.map((item) => {
            const row = {};
            headers.forEach((header) => {
                const key = headerMap[header];
                row[header] = item[key];
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        // 컬럼 너비 자동 조정 (선택 사항)
        const wscols = headers.map(() => ({ wch: 15 }));
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DataList");
        XLSX.writeFile(workbook, "DataTransfer_List.xlsx");
    }

    // 입력 변경 시 체크박스 자동 선택
    function handleInput(item) {
        item.checked = true;
        list = list; // 반응성 갱신
    }

    // --- TDataCode Modal Logic ---
    let showCodeModal = false;
    let codeList = [];
    let codeForm = { did: 0, seq: 0, dname: "", wdate: "", sf: "" };

    async function openCodeModal() {
        showCodeModal = true;
        await fetchCodeList();
        resetCodeForm();
    }

    function closeCodeModal() {
        showCodeModal = false;
    }

    function resetCodeForm() {
        codeForm = {
            did: 0,
            seq: 0,
            dname: "",
            wdate: new Date().toISOString().split("T")[0],
            sf: "",
        };
    }

    async function fetchCodeList() {
        let serviceUrl = $rooturl + "/dataManagement/code";
        const res = await fetch(serviceUrl);
        if (res.ok) {
            codeList = await res.json();
        } else {
            alert("코드 조회 실패: " + res.statusText);
        }
    }

    function selectCode(item) {
        codeForm = { ...item };
    }

    async function saveCode() {
        if (!codeForm.dname) {
            alert("이관차수명을 입력해주세요.");
            return;
        }
        let serviceUrl = $rooturl + "/dataManagement/code/save";
        const res = await fetch(serviceUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(codeForm),
        });
        if (res.ok) {
            alert("저장되었습니다.");
            await fetchCodeList();
            resetCodeForm();
        } else {
            alert("저장 실패");
        }
    }

    async function deleteCode() {
        if (codeForm.did === 0) {
            alert("삭제할 항목을 선택해주세요.");
            return;
        }
        if (!confirm("삭제하시겠습니까?")) return;

        let serviceUrl = $rooturl + "/dataManagement/code/del";
        const res = await fetch(serviceUrl, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ did: codeForm.did }),
        });
        if (res.ok) {
            alert("삭제되었습니다.");
            await fetchCodeList();
            resetCodeForm();
        } else {
            alert("삭제 실패");
        }
    }

    onMount(async () => {
        searchData();
    });
</script>

<div class="mx-auto p-3 w-10/12 h-5/6">
    <div class="flex justify-between">
        <div class="flex-col bg-gray-700 rounded-lg w-full">
            <div class="flex w-full border-b-2 border-gray-500 items-center">
                <h1 class="text-2xl w-3/5 tracking-tight text-yellow-100 p-3">
                    데이터이관 차수 관리
                </h1>
            </div>

            <div
                class="w-full overflow-auto bg-gray-700 p-3 rounded-lg max-h-[calc(100vh-310px)]"
            >
                <div class="w-full">
                    <div
                        class="w-full overflow-auto bg-gray-200 p-3 mb-3 rounded-lg"
                    >
                        <div class="flex justify-center">
                            <input
                                type="text"
                                bind:value={searchtxt}
                                placeholder="DB명 또는 계정 검색"
                                class="w-4/12 pl-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 pl-4 border border-gray-400 rounded shadow"
                            />
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => searchData()}
                                >{$t.com.btn.search}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => addRow()}>추가</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => deleteData()}
                                >{$t.com.btn.delete}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => saveData()}
                                >{$t.com.btn.save}</button
                            >
                            <input
                                type="file"
                                bind:this={fileInput}
                                accept=".xlsx, .xls"
                                on:change={handleFileUpload}
                                style="display: none;"
                            />
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={triggerFileUpload}
                                >{$t.com.btn.excelUpload}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={downloadExcel}>엑셀다운로드</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow flex items-center justify-center"
                                on:click={openCodeModal}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table
                        class="w-full text-md text-nowrap bg-gray-800 text-white shadow-md rounded mb-4"
                    >
                        <thead>
                            <tr>
                                {#each tableHeader as item}
                                    <th
                                        class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >
                                        {#if item === " "}
                                            <input
                                                type="checkbox"
                                                class="border-gray-300 rounded h-4 w-4"
                                                bind:checked={selectAll}
                                                on:change={toggleAll}
                                            />
                                        {:else}
                                            {item}
                                        {/if}
                                    </th>
                                {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#if paginatedlist.length > 0}
                                {#each paginatedlist as item, idx}
                                    <tr
                                        class="border-b hover:bg-gray-700 focus:bg-gray-700 {selectedRow ===
                                        idx
                                            ? 'bg-gray-700'
                                            : ''}"
                                        on:click={() => handleRowClick(idx)}
                                    >
                                        <td
                                            class="text-center p-3 px-2 border border-zinc-600"
                                        >
                                            <input
                                                type="checkbox"
                                                class="border-gray-300 rounded h-4 w-4"
                                                bind:checked={item.checked}
                                            />
                                        </td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-center"
                                                bind:value={item.did}
                                                on:input={() =>
                                                    handleInput(item)}
                                                readonly={item.flag === "old"}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="text"
                                                class="bg-transparent w-full"
                                                bind:value={item.dbname}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="text"
                                                class="bg-transparent w-full"
                                                bind:value={item.dbuser}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >

                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.tblAsis}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.tblTobe}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >

                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.idxAsis}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.idxTobe}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >

                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.objAsis}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.objTobe}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >

                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.invalidAsis}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.invalidTobe}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >

                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.checkTbl}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            ><input
                                                type="number"
                                                class="bg-transparent w-full text-right"
                                                bind:value={item.checkErr}
                                                on:input={() =>
                                                    handleInput(item)}
                                            /></td
                                        >
                                    </tr>
                                {/each}
                            {:else}
                                <tr>
                                    <td
                                        colspan="15"
                                        class="p-3 px-5 text-center text-yellow-100"
                                        >{$t.com.paging.noData}</td
                                    >
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="flex justify-center mt-4">
                    <button
                        class="px-3 py-1 mx-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                        on:click={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Prev
                    </button>
                    {#each Array(totalPages) as _, i}
                        <button
                            class="px-3 py-1 mx-1 rounded {currentPage === i + 1
                                ? 'bg-yellow-500 text-gray-900'
                                : 'bg-gray-600 text-white hover:bg-gray-500'}"
                            on:click={() => goToPage(i + 1)}
                        >
                            {i + 1}
                        </button>
                    {/each}
                    <button
                        class="px-3 py-1 mx-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                        on:click={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- TDataCode Modal -->
{#if showCodeModal}
    <div
        class="fixed z-50 inset-0 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
    >
        <div
            class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        >
            <div
                class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                aria-hidden="true"
                on:click={closeCodeModal}
            ></div>

            <span
                class="hidden sm:inline-block sm:align-middle sm:h-screen"
                aria-hidden="true">&#8203;</span
            >

            <div
                class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
            >
                <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div
                            class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full"
                        >
                            <h3
                                class="text-lg leading-6 font-medium text-gray-900"
                                id="modal-title"
                            >
                                이관 차수 관리
                            </h3>
                            <div class="mt-2 flex flex-col md:flex-row gap-4">
                                <!-- List Section -->
                                <div
                                    class="w-full md:w-1/2 border rounded p-2 h-96 overflow-y-auto"
                                >
                                    <table
                                        class="min-w-full divide-y divide-gray-200"
                                    >
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th
                                                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                    >DID</th
                                                >
                                                <th
                                                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                    >차수</th
                                                >
                                                <th
                                                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                    >이관차수명</th
                                                >
                                                <th
                                                    class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                    >작업일</th
                                                >
                                            </tr>
                                        </thead>
                                        <tbody
                                            class="bg-white divide-y divide-gray-200"
                                        >
                                            {#each codeList as code}
                                                <tr
                                                    class="hover:bg-gray-100 cursor-pointer {codeForm.did ===
                                                    code.did
                                                        ? 'bg-blue-100'
                                                        : ''}"
                                                    on:click={() =>
                                                        selectCode(code)}
                                                >
                                                    <td
                                                        class="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                                                        >{code.did}</td
                                                    >
                                                    <td
                                                        class="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                                                        >{code.seq}</td
                                                    >
                                                    <td
                                                        class="px-3 py-2 whitespace-nowrap text-sm text-gray-900"
                                                        >{code.dname}</td
                                                    >
                                                    <td
                                                        class="px-3 py-2 whitespace-nowrap text-sm text-gray-500"
                                                        >{code.wdate}</td
                                                    >
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Form Section -->
                                <div class="w-full md:w-1/2 border rounded p-4">
                                    <div class="mb-4">
                                        <label
                                            class="block text-gray-700 text-sm font-bold mb-2"
                                            for="did"
                                        >
                                            이관ID (DID)
                                        </label>
                                        <input
                                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                                            id="did"
                                            type="text"
                                            value={codeForm.did}
                                            readonly
                                        />
                                    </div>
                                    <div class="mb-4">
                                        <label
                                            class="block text-gray-700 text-sm font-bold mb-2"
                                            for="seq"
                                        >
                                            차수
                                        </label>
                                        <input
                                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            id="seq"
                                            type="number"
                                            bind:value={codeForm.seq}
                                        />
                                    </div>
                                    <div class="mb-4">
                                        <label
                                            class="block text-gray-700 text-sm font-bold mb-2"
                                            for="dname"
                                        >
                                            이관차수명
                                        </label>
                                        <input
                                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            id="dname"
                                            type="text"
                                            bind:value={codeForm.dname}
                                        />
                                    </div>
                                    <div class="mb-4">
                                        <label
                                            class="block text-gray-700 text-sm font-bold mb-2"
                                            for="wdate"
                                        >
                                            작업일
                                        </label>
                                        <input
                                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            id="wdate"
                                            type="date"
                                            bind:value={codeForm.wdate}
                                        />
                                    </div>
                                    <div class="mb-4">
                                        <label
                                            class="block text-gray-700 text-sm font-bold mb-2"
                                            for="sf"
                                        >
                                            특이사항
                                        </label>
                                        <textarea
                                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            id="sf"
                                            rows="3"
                                            bind:value={codeForm.sf}
                                        ></textarea>
                                    </div>
                                    <div
                                        class="flex items-center justify-end gap-2"
                                    >
                                        <button
                                            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                            type="button"
                                            on:click={resetCodeForm}
                                        >
                                            신규
                                        </button>
                                        <!-- <button
                                            class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                            type="button"
                                            on:click={deleteCode}
                                        >
                                            삭제
                                        </button> -->
                                        <button
                                            class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                            type="button"
                                            on:click={saveCode}
                                        >
                                            저장
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
                >
                    <button
                        type="button"
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        on:click={closeCodeModal}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
</style>
