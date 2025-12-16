<script>
    import { rooturl, t } from "../aqtstore";
    import * as XLSX from "xlsx";
    import { onMount } from "svelte";

    let selectedRow = 0;
    let fileInput; // 파일 input 요소 참조
    let searchtxt = "";
    let searchCondition = "SVCNM";
    let currentPage = 1;
    let itemsPerPage = 15;

    let list = [];

    function triggerFileUpload() {
        fileInput.click(); // 버튼 클릭 시 input 클릭 이벤트 발생
    }

    function downloadExcel() {
        const headers = [
            "TID",
            "SEQ",
            "TNAME",
            "gb",
            "APID",
            "APNM",
            "SID",
            "SVCNM",
            "DESC",
            "TSTIME",
            "STIME",
            "ETIME",
            "SFLAG",
            "SVCTIME",
            "STIME_ASIS",
            "ETIME_ASIS",
            "SVCTIME_ASIS",
        ];

        const data = list.map((item) => ({
            TID: item.TID,
            SEQ: item.SEQ,
            TNAME: item.TNAME,
            gb: item.gb,
            APID: item.APID,
            APNM: item.APNM,
            SID: item.SID,
            SVCNM: item.SVCNM,
            DESC: item.DESC,
            TSTIME: item.TSTIME,
            STIME: item.STIME,
            ETIME: item.ETIME,
            SFLAG: item.SFLAG,
            SVCTIME: item.SVCTIME,
            STIME_ASIS: item.STIME_ASIS,
            ETIME_ASIS: item.ETIME_ASIS,
            SVCTIME_ASIS: item.SVCTIME_ASIS,
        }));

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, "performance_data.xlsx");
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
            // 엑셀 헤더와 매핑할 키 정의 (순서대로)
            // 예시 데이터: {"APID":"3", "APNM":"테스트3", "SVCNM":"서비스명3", "DESC":"내용설명3", "TID": 1001, "SEQ": 1, "TNAME": "1차 통합 성능 테스트", "gb": "3", "SID": 11, "TSTIME": "2025-12-05 14:31:00", ...}

            const rows = jsonData.slice(1).map((row) => {
                let obj = {};
                headers.forEach((key, i) => {
                    obj[key] = row[i] || "";
                });

                // 기본값 설정 및 병합
                const defaults = {
                    checked: true,
                    flag: "new",
                    APID: "",
                    APNM: "",
                    SID: "",
                    SVCNM: "",
                    DESC: "",
                    TID: "",
                    SEQ: "",
                    TNAME: "",
                    gb: "3",
                    TSTIME: "",
                    STIME: "",
                    ETIME: "",
                    SFLAG: 0,
                    SVCTIME: 0,
                    STIME_ASIS: "",
                    ETIME_ASIS: "",
                    SVCTIME_ASIS: 0,
                    PKEY: "",
                };

                return { ...defaults, ...obj };
            });

            // 반응성을 유지하며 업데이트
            rows.reverse();
            rows.forEach((item) => {
                list = [item, ...list];
            });
        };
        reader.readAsArrayBuffer(file);
    }

    const handleRowClick = (idx) => {
        selectedRow = idx;
    };

    $: paginatedlist = list.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );
    $: totalPages = Math.ceil(list.length / itemsPerPage);
    $: console.log("list changed:", list);

    let maxPageButtons = 10;
    $: startPage =
        Math.floor((currentPage - 1) / maxPageButtons) * maxPageButtons + 1;
    $: endPage = Math.min(startPage + maxPageButtons - 1, totalPages);
    $: visiblePages =
        totalPages > 0
            ? Array.from(
                  { length: endPage - startPage + 1 },
                  (_, i) => startPage + i,
              )
            : [];

    let selectAll = false;

    // 전체 선택 토글 함수
    function toggleAll() {
        list = list.map((item) => ({ ...item, checked: selectAll }));
    }

    function goToPage(page) {
        if (page > 0 && page <= totalPages) {
            currentPage = page;
        }
    }

    // 행 추가
    function addRow() {
        const newRow = {
            checked: true,
            flag: "new",
            APID: "",
            APNM: "",
            SID: "",
            SVCNM: "",
            DESC: "",
            TID: "",
            SEQ: "",
            TNAME: "",
            gb: "3",
            TSTIME: "",
            STIME: "",
            ETIME: "",
            SFLAG: 0,
            SVCTIME: 0,
            STIME_ASIS: "",
            ETIME_ASIS: "",
            SVCTIME_ASIS: 0,
            PEKY: "",
        };
        list = [newRow, ...list];
    }

    function checkData() {
        const saveList = list.filter((item, idx) => item.checked);
        if (saveList.length == 0) {
            alert("선택된 데이터가 없습니다.");
            return false;
        }

        // 필수 입력 필드
        const mandatoryFields = [
            "TID",
            "SEQ",
            "TNAME",
            "gb",
            "APID",
            "APNM",
            "SID",
            "SVCNM",
            "DESC",
        ];
        // 날짜 형식 필드 (YYYY-MM-DD HH:mm:ss)
        const dateFields = [
            "TSTIME",
            "STIME",
            "ETIME",
            "STIME_ASIS",
            "ETIME_ASIS",
        ];
        // 숫자 형식 필드
        const numberFields = ["SFLAG", "SVCTIME", "SVCTIME_ASIS"];

        // 날짜 형식 정규식 (YYYY-MM-DD HH:mm:ss)
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

        for (let i = 0; i < saveList.length; i++) {
            const item = saveList[i];
            const rowNum = i + 1; // 1-based index for alert

            // 1. 필수 필드 체크
            for (const field of mandatoryFields) {
                if (!item[field] || item[field].toString().trim() === "") {
                    alert(
                        `[${rowNum}번째 행] ${field} 은(는) 필수 입력 항목입니다.`,
                    );
                    return false;
                }
            }

            // 2. 날짜 형식 체크 (값이 있는 경우에만)
            for (const field of dateFields) {
                if (item[field] && item[field].toString().trim() !== "") {
                    if (!dateRegex.test(item[field])) {
                        alert(
                            `[${rowNum}번째 행] ${field} 의 형식이 올바르지 않습니다.\n(Format: YYYY-MM-DD HH:mm:ss)`,
                        );
                        return false;
                    }
                }
            }

            // 3. 숫자 형식 체크
            for (const field of numberFields) {
                // 값이 없으면 0으로 간주하거나, 필수 체크가 아니므로 넘어갈 수 있음.
                // 여기서는 값이 있다면 숫자인지 체크. (빈 문자열이면 0으로 변환 가능한지 혹은 에러인지)
                // 보통 빈값은 허용하거나 0으로 처리됨. 명시적으로 숫자가 아닌 값을 체크.
                if (
                    item[field] !== "" &&
                    item[field] !== null &&
                    isNaN(Number(item[field]))
                ) {
                    alert(
                        `[${rowNum}번째 행] ${field} 은(는) 숫자여야 합니다.`,
                    );
                    return false;
                }
            }
        }

        return true;
    }

    // 조회
    async function searchPerf() {
        let serviceUrl =
            $rooturl +
            "/performManagement/perf_list?searchtxt=" +
            searchtxt +
            "&searchCondition=" +
            searchCondition;
        try {
            const res = await fetch(serviceUrl);
            if (res.ok) {
                const data = await res.json();
                list = data.map((item) => ({
                    ...item,
                    checked: false,
                    flag: "old",
                }));
                currentPage = 1;
                console.log(list);
            } else {
                throw new Error(res.statusText);
            }
        } catch (err) {
            console.error(err);
            alert("조회 중 오류가 발생했습니다: " + err.message);
        }
    }

    // 삭제
    // 삭제
    function deletePerf() {
        const saveList = list.filter((item) => item.checked);
        if (saveList.length === 0) {
            alert("선택된 데이터가 없습니다.");
            return;
        }

        if (!confirm("선택한 데이터를 삭제하시겠습니까?")) return;

        // 1. "new" 상태인 항목은 리스트에서 바로 제거
        const newItems = saveList.filter((item) => item.flag === "new");
        if (newItems.length > 0) {
            list = list.filter((item) => !item.checked || item.flag !== "new");
        }

        // 2. "old" 상태인 항목은 서버에 삭제 요청
        const oldItems = saveList.filter((item) => item.flag === "old");
        if (oldItems.length > 0) {
            let serviceUrl = $rooturl + "/performManagement/perf_del";

            fetch(serviceUrl, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oldItems),
            })
                .then(async (res) => {
                    let rmsg = await res.json();
                    if (res.status == 200 && rmsg.rdata === 1) {
                        alert("삭제되었습니다.");
                        // 삭제 성공 시 리스트에서 제거 (또는 재조회)
                        // 여기서는 리스트에서 제거하는 방식으로 처리
                        list = list.filter((item) => !oldItems.includes(item));
                        // 혹은 searchPerf(); 로 재조회 가능
                    } else {
                        alert("삭제 실패: " + rmsg.message);
                    }
                })
                .catch((err) => {
                    alert("error:" + err.message);
                });
        } else if (newItems.length > 0) {
            // newItems만 있었던 경우
            alert("삭제되었습니다.");
        }
    }

    // 저장
    async function savePerf() {
        if (!checkData()) return;
        if (!confirm("저장하시겠습니까?")) return;

        const saveList = list.filter((item, idx) => item.checked);
        let serviceUrl = $rooturl + "/performManagement/perf_upload";

        let successCount = 0;
        let failCount = 0;

        for (const item of saveList) {
            try {
                const res = await fetch(serviceUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                });
                const rmsg = await res.json();
                if (res.ok && rmsg.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error("Save failed for item:", item, rmsg);
                }
            } catch (err) {
                failCount++;
                console.error("Save error:", err);
            }
        }

        alert(`저장 완료: 성공 ${successCount}건, 실패 ${failCount}건`);
        searchPerf();
    }

    onMount(async () => {
        searchPerf();
    });
</script>

<div class="mx-auto p-3 w-10/12 h-5/6">
    <div class="flex justify-between">
        <div class="flex-col bg-gray-700 rounded-lg w-full">
            <div class="flex w-full border-b-2 border-gray-500 items-center">
                <h1 class="text-2xl w-3/5 tracking-tight text-yellow-100 p-3">
                    성능 데이터 적재 관리
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
                            <select
                                bind:value={searchCondition}
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow mr-2"
                            >
                                <option value="APID">APID</option>
                                <option value="TID">TID</option>
                                <option value="TNAME">TNAME</option>
                                <option value="SVCNM">SVCNM</option>
                            </select>
                            <input
                                type="text"
                                bind:value={searchtxt}
                                placeholder="검색어 입력"
                                class="w-4/12 pl-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 pl-4 border border-gray-400 rounded shadow"
                            />
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => searchPerf()}
                                >{$t.com.btn.search}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => addRow()}>추가</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => deletePerf()}
                                >{$t.com.btn.delete}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => savePerf()}
                                >{$t.com.btn.save}</button
                            >
                            <!-- 숨겨진 파일 업로드 input -->
                            <input
                                type="file"
                                bind:this={fileInput}
                                accept=".xlsx, .xls"
                                on:change={handleFileUpload}
                                style="display: none;"
                            />
                            <!-- 파일 업로드 버튼 -->
                            <!-- 양식 다운로드 버튼 -->
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={downloadExcel}>엑셀 다운로드</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={triggerFileUpload}
                                >{$t.com.btn.excelUpload}</button
                            >
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table
                        class="w-full text-md text-nowrap bg-gray-800 text-white shadow-md rounded mb-4"
                    >
                        <thead>
                            <tr>
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                >
                                    <input
                                        type="checkbox"
                                        class="border-gray-300 rounded h-4 w-4"
                                        bind:checked={selectAll}
                                        on:change={toggleAll}
                                    />
                                </th>
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >TID</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >차수</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >테스트명</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >구분</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >APID</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >업무명</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >SID</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >서비스명</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >설명</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >테스트일시</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >시작시간</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >종료시간</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >성공여부</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >소요시간</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >ASIS 시작</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >ASIS 종료</th
                                >
                                <th
                                    class="text-center p-3 px-2 border border-zinc-700 bg-zinc-600"
                                    >ASIS 소요</th
                                >
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
                                        on:click={() => (selectedRow = idx)}
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
                                        {#if item.flag === "new"}
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.TID}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.SEQ}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.TNAME}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.gb}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.APID}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.APNM}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.SID}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.SVCNM}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="true"
                                                bind:textContent={item.DESC}
                                            ></td>
                                        {:else}
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.TID}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.SEQ}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.TNAME}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.gb}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.APID}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.APNM}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.SID}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.SVCNM}
                                            ></td>
                                            <td
                                                class="p-3 px-2 border border-zinc-600"
                                                contenteditable="false"
                                                bind:textContent={item.DESC}
                                            ></td>
                                        {/if}
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.TSTIME}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.STIME}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.ETIME}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.SFLAG}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.SVCTIME}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.STIME_ASIS}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.ETIME_ASIS}
                                        ></td>
                                        <td
                                            class="p-3 px-2 border border-zinc-600"
                                            contenteditable="true"
                                            bind:textContent={item.SVCTIME_ASIS}
                                        ></td>
                                    </tr>
                                {/each}
                            {:else}
                                <tr>
                                    <td
                                        colspan="18"
                                        class="p-3 px-5 text-center text-yellow-100"
                                        >{$t.com.paging.noData}</td
                                    >
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="flex w-full justify-center mb-4">
                <button
                    class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                    on:click={() => goToPage(1)}
                    disabled={currentPage === 1}
                >
                    &lt;&lt;
                </button>
                <button
                    class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                    on:click={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    {$t.com.paging.previous}
                </button>
                {#each visiblePages as page}
                    <button
                        class="px-3 py-1 bg-gray-300 text-black rounded mx-1 hover:bg-gray-500"
                        class:bg-gray-700={page === currentPage}
                        on:click={() => goToPage(page)}
                    >
                        {page}
                    </button>
                {/each}
                <button
                    class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                    on:click={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    {$t.com.paging.next}
                </button>
                <button
                    class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                    on:click={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    &gt;&gt;
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    th {
        color: #eee;
    }
</style>
