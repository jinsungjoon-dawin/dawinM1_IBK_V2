<script lang="ts">
    // @ts-nocheck
    import { rooturl, t } from "../aqtstore";
    import * as XLSX from "xlsx";
    import { onMount } from "svelte";

    let selectedRow = 0;
    let fileInput; // 파일 input 요소 참조
    let gubun;
    let searchtxt = "";
    let currentPage = 1;
    let itemsPerPage = 15;
    let pageRange = 10;
    let list = [];
    let statusData = [];
    let descData = "";

    function triggerFileUpload() {
        fileInput.click(); // 버튼 클릭 시 input 클릭 이벤트 발생
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            // 엑셀 업로드 시 기존 리스트 초기화
            list = [];
            isSearchMode = false;
            currentPage = 1;

            // DB에서 Max Pkey 조회
            let maxPkey = 0;
            try {
                const res = await fetch(
                    $rooturl + "/scenarioUploadManagement/scenario_max_pkey",
                );
                if (res.ok) {
                    maxPkey = await res.json();
                }
            } catch (err) {
                console.error("Max Pkey fetch error:", err);
            }

            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = jsonData[0];
            // list.length check removed as we cleared it above

            const rows = jsonData.slice(1).map((row, index) => {
                let obj = {};
                const headerMap = {
                    이행명: "cddesc",
                    이행코드: "mid",
                    작업설명: "desc",
                    mgb: "mgb",
                    시작일: "startdt",
                    종료일: "enddt",
                    시나리오건수: "scenario",
                    주제ID: "apid",
                    주제명: "apnm",
                    시나리오코드: "scno",
                    시나리오그룹: "scgrp",
                    세부작업내용: "worknm",
                    계획시작일시: "planstdt",
                    계획종료일시: "planendt",
                    시작일시: "actstdt",
                    종료일시: "actendt",
                    예상소요시간: "esttime",
                    실소요시간: "acttime",
                    플랫폼담당자: "siusr",
                    현업담당자: "smusr",
                    수행서버: "pserver",
                };

                headers.forEach((key, i) => {
                    const mappedKey = headerMap[key] || key;
                    obj[mappedKey] = row[i] || "";
                });

                const merged = {};
                const cols = {
                    isNew: true,
                    checked: true,
                    pkey: maxPkey + index + 1, // 순차적으로 pkey 자동 할당
                    mid: "",
                    cddesc: "",
                    mgb: "0",
                    startdt: "",
                    enddt: "",
                    scenario: "",
                    apid: "",
                    apnm: "",
                    scno: "", // 시나리오코드
                    scgrp: "", // 시나리오그룹
                    mclass: "",
                    disyn: "",
                    sidesc: "",
                    worknm: "", // 세부작업내용
                    planstdt: "",
                    planendt: "",
                    actstdt: "",
                    actendt: "",
                    esttime: "",
                    acttime: "",
                    wstat: "",
                    pscno: "",
                    cscno: "",
                    siusr: "",
                    smusr: "",
                    pserver: "",
                    cddesc: "", // 이행명 (Select Box)
                };

                // 모든 키 가져오기
                const keys = new Set([
                    ...Object.keys(obj),
                    ...Object.keys(cols),
                ]);

                // 각 키별로 병합
                keys.forEach((key) => {
                    // pkey는 자동 할당하므로 엑셀 값 덮어쓰기 방지 (단, 엑셀에 pkey 컬럼이 있어도 무시)
                    if (key === "pkey") return;
                    merged[key] = obj[key] !== undefined ? obj[key] : cols[key];
                    if (key == "admin")
                        merged[key] =
                            merged[key] == "O" || merged[key] == 0
                                ? false
                                : true;
                });
                // pkey 할당 확인
                if (!merged.pkey) merged.pkey = cols.pkey;

                // 엑셀 업로드 시 이행명(cddesc) 매칭 -> mid, mgb 자동 설정
                if (merged.cddesc) {
                    const descClean = String(merged.cddesc).trim();
                    const match = statusData.find(
                        (item) => item.cddesc == descClean,
                    );
                    if (match) {
                        merged.cddesc = match.cddesc;
                        merged.mid = match.mid;
                        merged.mgb = match.mgb;
                        // merged.desc (작업설명)는 원본 유지하거나 필요시 업데이트
                    }
                }

                return merged;
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
        selectedRow = idx; // 현재 클릭된 row의 seq를 기준으로 선택 상태 설정
        currentPage = 1;
    };

    $: paginatedList = list.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    $: totalPages = Math.ceil(list.length / itemsPerPage);

    $: pageNumbers = (() => {
        let start = Math.max(1, currentPage - Math.floor(pageRange / 2));
        let end = start + pageRange - 1;

        // 마지막 페이지에 가까워지면 조정
        if (end > totalPages) {
            end = totalPages;
            start = Math.max(1, end - pageRange + 1);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    })();

    let selectAll = false;
    let isSearchMode = false; // 검색 모드 상태 추가

    // 전체 선택 토글 함수
    function toggleAll() {
        list = list.map((item) => ({ ...item, checked: selectAll }));
    }

    // 개별 체크박스 변경 감지
    function updateSelection() {
        selectAll = list.every((item) => item.checked);
    }

    function goToPage(page) {
        if (page > 0 && page <= totalPages) {
            currentPage = page;
        }
    }

    function checkData() {
        const saveList = list.filter((item, idx) => item.checked);
        if (saveList.length == 0) {
            alert($t.loadDataUpload.checkData);
            return false;
        }
        return true;
    }

    let selCddesc = "";
    let selDate = "";

    // 조회
    async function searchScenarioData() {
        currentPage = 1;
        let serviceUrl =
            $rooturl +
            "/scenarioUploadManagement/scenario_list?gubun=" +
            gubun +
            "&searchtxt=" +
            searchtxt +
            "&cddesc=" +
            selCddesc +
            "&date=" +
            selDate;
        const res = await fetch(serviceUrl);
        if (res.ok) {
            list = await res.json();
            isSearchMode = true; // 검색 완료 시 플래그 설정
        } else {
            throw new Error(res.statusText);
        }
    }

    async function scenarioSelData() {
        let serviceUrl =
            $rooturl + "/scenarioUploadManagement/scenario_sel_data";
        const res = await fetch(serviceUrl);
        if (res.ok) {
            statusData = await res.json();
        } else {
            throw new Error(res.statusText);
        }
    }

    let scenariomgb = 0;

    // 이행명 셀렉트 박스에서 선택시
    function midnmchange(idx, e) {
        console.log(paginatedList[idx]);
        let seldesc = e.target.value;
        let seldata = statusData.filter((item) => item.cddesc == seldesc);
        paginatedList[idx].mid = seldata[0].mid;
        paginatedList[idx].mgb = seldata[0].mgb;
        paginatedList[idx].cddesc = seldata[0].cddesc;

        // startdt, enddt formatting for datetime-local
        let sdate = seldata[0].startdt;
        console.log(sdate);
        if (sdate) {
            let formattedDate = sdate.replace(" ", "T").substring(0, 16);
            paginatedList[idx].planstdt = formattedDate;
        }

        let edate = seldata[0].enddt;
        if (edate) {
            let formattedDate = edate.replace(" ", "T").substring(0, 16);
            paginatedList[idx].planendt = formattedDate;
        }
    }

    // 행 취소
    function cancelRow(item) {
        list = list.filter((i) => i !== item);
    }

    // 시나리오 추가
    async function addScenarioData() {
        // 검색된 상태에서 추가 시 리스트 초기화
        if (isSearchMode) {
            list = [];
            isSearchMode = false;
        }

        currentPage = 1;

        let dbMaxPkey = 0;
        try {
            let serviceUrl =
                $rooturl + "/scenarioUploadManagement/scenario_max_pkey";
            const res = await fetch(serviceUrl);
            if (res.ok) {
                dbMaxPkey = await res.json();
            }
        } catch (e) {
            console.error("Failed to fetch max pkey", e);
        }

        let listMaxPkey = 0;
        if (list.length > 0) {
            listMaxPkey = Math.max(
                ...list.map((item) => Number(item.pkey) || 0),
            );
        }

        const maxPkey = Math.max(dbMaxPkey, listMaxPkey);

        list = [
            {
                isNew: true,
                checked: true,
                pkey: maxPkey + 1,
                mid: "",
                cddesc: "",
                desc: "",
                mgb: "0",
                startdt: "",
                enddt: "",
                scenario: "",
                apid: "",
                apnm: "",
                scno: "",
                scgrp: "",
                mclass: "",
                disyn: "",
                sidesc: "",
                worknm: "",
                planstdt: "",
                planendt: "",
                actstdt: "",
                actendt: "",
                esttime: "",
                acttime: "",
                wstat: "",
                pscno: "",
                cscno: "",
                siusr: "",
                smusr: "",
                pserver: "",
            },
            ...list,
        ]; // 새로운 배열로 업데이트 (반응성 유지)
    }

    // 시나리오 삭제
    function deleteScenarioData() {
        if (!checkData()) return;
        if (!confirm($t.scenarioUpload.deleteConfirm)) return;

        const saveList = list.filter((item, idx) => item.checked);
        let serviceUrl = $rooturl + "/scenarioUploadManagement/scenario_del";

        fetch(serviceUrl, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(saveList),
        })
            .then(async (res) => {
                let rmsg = await res.json();
                if (res.status == 200 && rmsg.rdata === 1) {
                    alert($t.scenarioUpload.deleteSuccess);
                    searchScenarioData();
                }
            })
            .catch((err) => {
                alert("error:" + err.message);
            });
    }

    // 시나리오 저장
    function saveScenarioData() {
        if (!checkData()) return;
        if (!validationCheck()) return;
        if (!confirm($t.scenarioUpload.saveConfirm)) return;

        const saveList = list.filter((item, idx) => item.checked);
        let serviceUrl = $rooturl + "/scenarioUploadManagement/scenario_save";

        fetch(serviceUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(saveList),
        })
            .then(async (res) => {
                let rmsg = await res.json();
                if (res.status == 200 && rmsg.rdata === 1) {
                    alert($t.scenarioUpload.saveSuccess);

                    // 저장 후 첫 번째 항목의 이행명으로 자동 조회
                    if (saveList.length > 0) {
                        gubun = "1"; // 이행명
                        searchtxt = saveList[0].cddesc;
                        searchScenarioData();
                    }
                }
            })
            .catch((err) => {
                alert("error:" + err.message);
            });
    }

    let errors = {}; // 에러 상태 저장

    function validationCheck() {
        errors = {};
        for (var i = 0; i < list.length; i++) {
            if (list[i].checked === true) {
                // 이행명
                if (list[i].cddesc === "") {
                    errors[i] = {
                        ...errors[i],
                        cddesc:
                            $t.scenarioUpload.cdDesc + $t.scenarioUpload.check,
                    };
                    alert($t.scenarioUpload.cdDesc + $t.scenarioUpload.check);
                    return false;
                }
                // 시나리오코드
                else if (list[i].scno == "" || list[i].scno == null) {
                    errors[i] = {
                        ...errors[i],
                        scno: $t.scenarioUpload.scno + $t.scenarioUpload.check,
                    };
                    alert($t.scenarioUpload.scno + $t.scenarioUpload.check);
                    return false;
                }
                // 시나리오 그룹
                else if (list[i].scgrp == "" || list[i].scgrp == null) {
                    errors[i] = {
                        ...errors[i],
                        scgrp:
                            $t.scenarioUpload.scgrp + $t.scenarioUpload.check,
                    };
                    alert($t.scenarioUpload.scgrp + $t.scenarioUpload.check);
                    return false;
                }
                // 세부작업내용
                // else if (list[i].worknm == "" || list[i].worknm == null) {
                //     errors[i] = {
                //         ...errors[i],
                //         worknm:
                //             $t.scenarioUpload.worknm + $t.scenarioUpload.check,
                //     };
                //     alert($t.scenarioUpload.worknm + $t.scenarioUpload.check);
                //     return false;
                // }
                // 계획시작일
                else if (list[i].planstdt == "" || list[i].planstdt == null) {
                    errors[i] = {
                        ...errors[i],
                        planstdt:
                            $t.scenarioUpload.planstdt +
                            $t.scenarioUpload.check,
                    };
                    alert($t.scenarioUpload.planstdt + $t.scenarioUpload.check);
                    return false;
                }
                // 계획종료일
                else if (list[i].planendt == "" || list[i].planendt == null) {
                    errors[i] = {
                        ...errors[i],
                        planendt:
                            $t.scenarioUpload.planendt +
                            $t.scenarioUpload.check,
                    };
                    alert($t.scenarioUpload.planendt + $t.scenarioUpload.check);
                    return false;
                }
            }
        }
        return true;
    }

    function excelDownload() {
        if (list.length === 0) {
            alert("다운로드할 데이터가 없습니다.");
            return;
        }

        const header = [
            "이행코드",
            "이행명",
            "mgb",
            "시작일",
            "종료일",
            "시나리오건수",
            "주제ID",
            "주제명",
            "시나리오코드",
            "시나리오그룹",
            "mclass",
            "화면출력여부",
            "작업설명",
            "세부작업내용",
            "계획시작일시",
            "계획종료일시",
            "시작일시",
            "종료일시",
            "예상소요시간",
            "실소요시간",
            "상태",
            "선행ID",
            "병행ID",
            "SI담당자",
            "SM담당자",
            "수행서버",
        ];

        const data = list.map((item) => [
            item.mid,
            item.cddesc,
            item.mgb,
            item.startdt,
            item.enddt,
            item.scenario,
            item.apid,
            item.apnm,
            item.scno,
            item.scgrp,
            item.mclass,
            item.disyn,
            item.sidesc,
            item.worknm,
            item.planstdt,
            item.planendt,
            item.actstdt,
            item.actendt,
            item.esttime,
            item.acttime,
            item.wstat,
            item.pscno,
            item.cscno,
            item.siusr,
            item.smusr,
            item.pserver,
        ]);

        const workBook = XLSX.utils.book_new();
        const workSheet = XLSX.utils.aoa_to_sheet([header, ...data]);
        XLSX.utils.book_append_sheet(workBook, workSheet, "ScenarioList");
        XLSX.writeFile(workBook, "Scenario_List.xlsx");
    }

    onMount(async () => {
        scenarioSelData();
        // searchScenarioData();
    });

    function formatNumber(value) {
        return value != null && typeof value === "number"
            ? value.toLocaleString()
            : "";
    }

    function getFormatNumber(value) {
        return formatNumber(value);
    }
</script>

<div class="mx-auto p-3 w-10/12 h-5/6">
    <div class="flex justify-between">
        <div class="flex-col bg-gray-700 rounded-lg w-full">
            <div class="flex w-full border-b-2 border-gray-500 items-center">
                <h1 class="text-2xl w-3/5 tracking-tight text-yellow-100 p-3">
                    {$t.scenarioUpload.pageNm}
                </h1>
            </div>
            <div>
                <div class="p-3">
                    <div class="w-full bg-gray-200 p-3 rounded-lg">
                        <div class="flex justify-center">
                            <select
                                on:change={() => (currentPage = 1)}
                                bind:value={selCddesc}
                                class="w-2/12 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded-l shadow"
                            >
                                <option value="">이행명</option>
                                {#each statusData as statusDataItem}
                                    <option value={statusDataItem.desc}
                                        >{statusDataItem.desc}</option
                                    >
                                {/each}
                            </select>
                            <select
                                on:change={() => (currentPage = 1)}
                                bind:value={selDate}
                                class="w-2/12 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 shadow"
                            >
                                <option value="">수행일자</option>
                                {#each [...new Set(statusData.map((item) => item.enddt))]
                                    .sort()
                                    .reverse() as date}
                                    <option value={date}>{date}</option>
                                {/each}
                            </select>

                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mr-2 py-2 px-4 border border-gray-400 rounded-r shadow"
                                on:click={() => searchScenarioData()}
                                >{$t.com.btn.search}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => addScenarioData()}
                                >{$t.com.btn.scenarioAdd}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => deleteScenarioData()}
                                >{$t.com.btn.delete}</button
                            >
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={() => saveScenarioData()}
                                >{$t.com.btn.save}</button
                            >
                            <!-- 파일 업로드 버튼 -->
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={excelDownload}>엑셀 다운로드</button
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
                            <button
                                class="bg-white hover:bg-gray-100 text-gray-800 font-semibold mx-2 py-2 px-4 border border-gray-400 rounded shadow"
                                on:click={triggerFileUpload}
                                >{$t.com.btn.excelUpload}</button
                            >
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="w-full overflow-auto bg-gray-700 px-3 rounded-lg max-h-[calc(100vh-310px)]"
            >
                <table
                    class="w-full text-md text-nowrap bg-gray-800 text-white shadow-md rounded mb-4"
                >
                    <thead>
                        <tr>
                            {#each $t.scenarioUpload.tableHeader as item, idx}
                                <th
                                    class="text-center p-3 border border-zinc-700
                                    {idx === 0 || idx === 3
                                        ? 'bg-gray-500'
                                        : 'bg-zinc-600'}
                                    {idx === 0
                                        ? 'sticky left-0 z-20 w-[60px] min-w-[60px]'
                                        : ''} 
                                    {idx === 3
                                        ? 'sticky left-[60px] z-20 border-r-2 border-gray-400'
                                        : ''}
                                    {idx === 1 ||
                                    idx === 2 ||
                                    idx === 4 ||
                                    // idx === 5 ||
                                    // idx === 6 ||
                                    idx === 7
                                        ? 'hidden'
                                        : ''}
                                    "
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
                        {#if paginatedList.length > 0}
                            {#each paginatedList as item, idx}
                                <tr
                                    class="border-b hover:bg-gray-700 focus:bg-gray-700 {selectedRow ===
                                    idx
                                        ? 'bg-gray-700'
                                        : ''}"
                                    on:click={() => (selectedRow = idx)}
                                >
                                    <td
                                        class="text-center p-3 px-5 border border-zinc-600 bg-gray-600 sticky left-0 z-10 w-[60px] min-w-[60px]"
                                    >
                                        {#if item.isNew}
                                            <button
                                                type="button"
                                                class="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-700 font-bold"
                                                on:click={() => cancelRow(item)}
                                            >
                                                X
                                            </button>
                                        {/if}
                                        <input
                                            type="checkbox"
                                            class="border-gray-300 rounded h-4 w-4"
                                            bind:checked={item.checked}
                                        />
                                    </td>
                                    <td
                                        class="hidden text-right p-3 px-5 border border-zinc-600 bg-gray-800 sticky left-97"
                                        contenteditable="false"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.pkey}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            disabled
                                        />
                                    </td>
                                    <td
                                        class="hidden text-right p-3 px-5 border border-zinc-600 bg-gray-800"
                                        contenteditable="false"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.mid}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            disabled
                                            hidden
                                        />
                                    </td>
                                    <td
                                        class="text-center p-3 px-5 border border-zinc-600 bg-gray-600 sticky left-[60px] z-10 border-r-2 border-gray-500"
                                        contenteditable="false"
                                    >
                                        <select
                                            class="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                                            bind:value={item.cddesc}
                                            on:change={(e) =>
                                                midnmchange(idx, e)}
                                            class:error={errors[idx]?.cddesc}
                                        >
                                            {#each statusData as statusDataItem}
                                                <option
                                                    value={statusDataItem.desc}
                                                    >{statusDataItem.desc}</option
                                                >
                                            {/each}
                                        </select>
                                    </td>
                                    <td
                                        class="hidden text-right p-3 px-5 border border-zinc-600"
                                        contenteditable="false"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.mgb}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            disabled
                                        />
                                    </td>
                                    <td
                                        class=" text-right p-3 px-5 border border-zinc-600 max-w-[200px] truncate"
                                        bind:textContent={item.startdt}
                                        contenteditable="false"
                                    ></td>
                                    <td
                                        class=" text-right p-3 px-5 border border-zinc-600 max-w-[200px] truncate"
                                        bind:textContent={item.enddt}
                                        contenteditable="false"
                                    ></td>
                                    <td
                                        class="hidden text-right p-3 px-5 border border-zinc-600"
                                        bind:textContent={item.scenario}
                                        contenteditable="true"
                                    ></td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                        bind:textContent={item.apid}
                                        contenteditable="true"
                                    ></td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                        bind:textContent={item.apnm}
                                        contenteditable="true"
                                    ></td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.scno}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            class:error={errors[idx]?.scno}
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.scgrp}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            class:error={errors[idx]?.scgrp}
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.mclass}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.disyn}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.desc}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.worknm}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            class:error={errors[idx]?.worknm}
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="datetime-local"
                                            bind:value={item.planstdt}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            class:error={errors[idx]?.planstdt}
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="datetime-local"
                                            bind:value={item.planendt}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                            class:error={errors[idx]?.planendt}
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        {#if item.actstdt == "1900-01-01 00:00:00"}
                                            {(item.actstdt = "")}
                                        {/if}
                                        <input
                                            type="datetime-local"
                                            bind:value={item.actstdt}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        {#if item.actendt == "1900-01-01 00:00:00"}
                                            {(item.actendt = "")}
                                        {/if}
                                        <input
                                            type="datetime-local"
                                            bind:value={item.actendt}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.esttime}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="number"
                                            bind:value={item.acttime}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            bind:value={item.wstatnm}
                                            class="bg-transparent text-right"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        {item.pscno}
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.cscno}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.siusr}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.smusr}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                    <td
                                        class="text-right p-3 px-5 border border-zinc-600"
                                    >
                                        <input
                                            type="text"
                                            bind:value={item.pserver}
                                            class="bg-transparent text-right"
                                            min="0"
                                            max="9999"
                                        />
                                    </td>
                                </tr>
                            {/each}
                        {:else}
                            <tr>
                                <td
                                    colspan="20"
                                    class="p-3 px-5 text-center text-yellow-100"
                                    >{$t.com.paging.noData}</td
                                >
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>

            <div class="flex w-full justify-center my-4">
                <button
                    class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                    on:click={() => goToPage(1)}
                    disabled={currentPage === 1}
                >
                    {$t.com.paging.first}
                </button>
                <button
                    class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                    on:click={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    {$t.com.paging.previous}
                </button>
                {#each pageNumbers as page}
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
                    {$t.com.paging.last}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .error {
        background-color: #ff205675;
    }
    .left-97 {
        left: 97px;
    }
</style>
