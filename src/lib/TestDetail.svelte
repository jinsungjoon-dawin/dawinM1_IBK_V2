<script>
  import TestComposit from "./TestComposit.svelte";
  import BarChart from "./BarChart.svelte";
  import PieChart from "./PieChart.svelte";
  import { onMount } from "svelte";
  import { rooturl, t } from "../aqtstore";
  import * as XLSX from "xlsx";
  export let selData;
  export let selectedRow;
  // let { selData,  selectedRow} = $props();
  let selected = true;

  let leftDates = [];
  let list = [];
  let subjectList = [];

  $: if (list) {
    const subjects = list.map((item) => item.apnm).filter(Boolean);
    subjectList = ["ALL", ...new Set(subjects)];
  }

  // ... (existing helper functions) ...

  //차수, ASIS 일자, TOBE 일자 조회
  async function getTestcomposit() {
    const res = await fetch($rooturl + "/testcomposit");
    if (res.ok) {
      return await res.json();
    } else throw new Error(res.statusText);
  }

  async function getPerformcompositList() {
    const res = await fetch(
      $rooturl + "/testdetail/testde_list?tid=" + leftDates[selectedRow].tid,
    );
    if (res.ok) {
      list = await res.json();
      return list;
    } else throw new Error(res.statusText);
  }

  onMount(async () => {
    leftDates = await getTestcomposit();

    //[{"seq":"1차","asisdt":"2025-01-02","tobedt":"2025-01-20"}]
    if (leftDates.length > 0) {
      list = await getPerformcompositList();
    }
    //[{"tname":"성능1차 테스트 결과","tobedt":"2025-01-20"}]
  });
  function excelDown() {
    // 🔹 헤더 추가
    let header = $t.testDetail.excelTitles;

    // 🔹 JSON 데이터를 배열로 변환 (첫 줄은 헤더)
    let worksheetData = [
      header,
      ...list.map((obj) => [
        obj.apnm,
        obj.gubun,
        obj.svcnm,
        obj.tstime,
        obj.stime,
        obj.etime,
        obj.svctime,
      ]),
    ];

    // 🔹 워크시트 생성
    let ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws["!cols"] = header.map((h) => ({ wch: h.length + 5 })); // +5s는 여유 공간
    // 🔹 워크북 생성 및 워크시트 추가
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // 🔹 엑셀 파일 생성 및 다운로드
    XLSX.writeFile(
      wb,
      leftDates[selectedRow].tname + $t.testDetail.excelFileName,
    );
  }

  const handleRowClick = (idx) => {
    selectedRow = idx; // 현재 클릭된 row의 seq를 기준으로 선택 상태 설정
    currentPage = 1;
  };

  let selectedStatus = "ALL";
  let searchSubject = "ALL";
  let currentPage = 1;
  let itemsPerPage = 15;

  $: paginatedlist =
    selectedStatus === "ALL" && searchSubject === "ALL"
      ? list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      : list
          .filter((item) => {
            const matchStatus =
              selectedStatus === "ALL" || item.gubun === selectedStatus;
            const matchSubject =
              searchSubject === "ALL" || item.apnm === searchSubject;
            return matchStatus && matchSubject;
          })
          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  $: totalPages = Math.ceil(
    (selectedStatus === "ALL" && searchSubject === "ALL"
      ? list.length
      : list.filter((item) => {
          const matchStatus =
            selectedStatus === "ALL" || item.gubun === selectedStatus;
          const matchSubject =
            searchSubject === "ALL" || item.apnm === searchSubject;
          return matchStatus && matchSubject;
        }).length) / itemsPerPage,
  );

  function goToPage(page) {
    if (page > 0 && page <= totalPages) {
      currentPage = page;
    }
  }

  function printTable() {
    window.print();
  }
</script>

{#if selected}
  <div class="mx-auto p-3 w-10/12 h-5/6">
    <div class="flex justify-between">
      <div class="w-3/12 bg-gray-700 rounded-lg flex-wrap p-3">
        <div class="flex border rounded border-zinc-600 text-zinc-100">
          <label class="px-3 w-2/5 py-2 border-r border-l border-zinc-600"
            >{$t.testDetail.leftTitle}</label
          >
          <!-- <label class="px-3 w-2/5 py-2 border-r border-l  border-zinc-600 ">Asis</label> -->
          <label class="px-3 w-3/5 py-2 border-r border-l border-zinc-600"
            >{$t.testDetail.leftDate}</label
          >
        </div>
        {#if leftDates.length !== 0}
          {#each leftDates as item, idx}
            <div
              class="flex mb-3 border rounded border-zinc-600 text-zinc-100"
              on:click={() => {
                handleRowClick(idx);
                getPerformcompositList();
              }}
            >
              <label
                class="px-3 w-2/5 py-2 border-r border-l bg-zinc-700 border-zinc-600 {selectedRow ===
                idx
                  ? 'text-yellow-100'
                  : ''}">{item.tname}</label
              >
              <input
                type="text"
                class="w-3/5 pl-3 border-r bg-zinc-700 border-zinc-600 {selectedRow ===
                idx
                  ? 'text-yellow-100'
                  : ''}"
                value={item.tobedt}
                readonly
              />
            </div>
          {/each}
        {/if}
      </div>

      <div class="flex flex-wrap flex-row items-center mx-2 w-9/12">
        {#if leftDates.length !== 0}
          <!-- {#each datas as item, idx} -->
          <div class="flex-col bg-gray-700 rounded-lg w-full">
            <div class="flex w-full border-b-2 border-gray-500 items-center">
              <h1 class="text-2xl w-3/5 tracking-tight text-yellow-100 p-3">
                {leftDates[selectedRow].tname}
                {$t.testDetail.title}
              </h1>
              <h1
                class="text-1xl w-2/5 text-end tracking-tight text-yellow-100 p-3"
                on:click={() => {
                  selected = false;
                  selectedValue = leftDates[selectedRow];
                }}
              >
                {$t.testDetail.date}
                {leftDates[selectedRow].tobedt}
              </h1>
              <div class="w-36 px-4 text-end">
                <button
                  class="bg-gray-500 hover:bg-sky-500 text-yellow-100 py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  on:click={() => {
                    selected = false;
                  }}>{$t.com.btn.prePage}</button
                >
              </div>
            </div>

            <div class="flex justify-end items-center w-full mt-3">
              <label class="text-gray-300">조회조건 :&nbsp;&nbsp;</label>
              <label class="text-gray-300 mr-2">주제</label>
              <select
                bind:value={searchSubject}
                class="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-5"
                on:change={() => (currentPage = 1)}
              >
                {#each subjectList as subject}
                  <option value={subject}
                    >{subject === "ALL" ? "전체" : subject}</option
                  >
                {/each}
              </select>
              <label class="text-gray-300">상태</label>
              <select
                on:change={(currentPage = 1)}
                bind:value={selectedStatus}
                class="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-5"
              >
                {#each $t.com.sel.status.test as item}
                  <option value={item.key}>{item.value}</option>
                {/each}
              </select>
              <button
                class="bg-green-500 hover:bg-green-700 text-yellow-100 py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-3 ml-5"
                on:click={excelDown}>{$t.com.btn.excelDown}</button
              >
            </div>
            <div class="flex flex-wrap w-full p-3 justify-center">
              <div
                class="w-full overflow-auto bg-gray-800 p-3 rounded-lg max-h-[calc(100vh-280px)]"
              >
                <table
                  class="w-full text-md bg-gray-800 text-nowrap text-white shadow-md rounded mb-4"
                >
                  <thead>
                    <tr class="border-b">
                      {#each $t.testDetail.tableHeader as item}
                        <th
                          class="text-left font-extrabold p-3 px-5 border border-zinc-700 bg-zinc-600"
                          >{item}</th
                        >
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#if paginatedlist.length > 0}
                      {#each paginatedlist as item, index}
                        <tr class="border-b hover:bg-gray-700">
                          <td class="p-3 px-5 border border-zinc-600">
                            {item.apnm}
                          </td>
                          <td class="p-3 px-5 border border-zinc-600">
                            {item.gubun}
                          </td>
                          <td class="p-3 px-5 border border-zinc-600">
                            {item.svcnm}
                          </td>
                          <td class="p-3 px-5 border border-zinc-600">
                            {item.tstime}
                          </td>
                          <td class="p-3 px-5 border border-zinc-600">
                            {item.stime}
                          </td>

                          <td class="p-3 px-5 border border-zinc-600">
                            {item.etime}
                          </td>
                          <td class="p-3 px-5 border border-zinc-600">
                            {item.svctime}
                          </td>
                          <!-- <td class="p-3 px-5 border border-zinc-600 ">
                                      {item.stimeasis}
                                    </td><td class="p-3 px-5 border border-zinc-600 ">
                                      {item.etimeasis}
                                    </td><td class="p-3 px-5 border border-zinc-600 ">
                                      {item.svctimeasis}
                                    </td> -->
                        </tr>
                      {/each}
                    {:else}
                      <tr>
                        <td
                          colspan="9"
                          class="p-3 px-5 text-center border-zinc-600"
                          >{$t.com.paging.noData}</td
                        >
                      </tr>
                    {/if}
                  </tbody>
                </table>
              </div>
              <div class="flex w-full justify-center mt-4">
                <button
                  class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                  on:click={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {$t.com.paging.previous}
                </button>
                {#each Array(totalPages).fill() as _, pageIndex}
                  <button
                    class="px-3 py-1 bg-gray-300 text-black rounded mx-1 hover:bg-gray-500"
                    class:bg-gray-700={pageIndex + 1 === currentPage}
                    on:click={() => goToPage(pageIndex + 1)}
                  >
                    {pageIndex + 1}
                  </button>
                {/each}
                <button
                  class="px-3 py-1 bg-gray-500 text-yellow-100 rounded mx-1 hover:bg-gray-700"
                  on:click={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {$t.com.paging.next}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <TestComposit></TestComposit>
{/if}
