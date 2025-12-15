import mondb from '../db/dbconn.js';

const tmigscene = {
    /**
     * 이행 우측 이행 전광판
     * PieChart
     */
    ttransbolist: async (args) => {
        //console.log("args.query.mid : " + args.query.mid);      

        let rows = await mondb.query(` with timg_tot as 
                                        (select x.mid		as mid
                                            , x.wstat 		as wstat
                                            , x.cnt 		as cnt
                                            , y.scenario 	as scenario
                                        from (select a.mid			                    as mid
                                                   , nvl(a.wstat,0) 	                as wstat
                                                   , count(nvl(a.ActStdt,'1900-01-01'))	as cnt
                                                from tmigscene a
                                                where a.mid = ?
                                                group by a.mid, nvl(a.wstat,0)
                                            ) x
                                        join tmigcode y
                                            on x.mid = y.mid)
                                    , timg as 
                                        (select x.mid		as mid
                                            , x.scgrp 		as scgrp
                                            , x.wstat 		as wstat
                                            , x.cnt 		as cnt
                                            , y.scenario 	as scenario
                                        from (select a.mid			                    as mid
                                                , a.scgrp			                    as scgrp
                                                , nvl(a.wstat,0) 	                    as wstat
                                                , count(nvl(a.ActStdt,'1900-01-01'))	as cnt
                                                from tmigscene a
                                                where a.mid = ?
                                                group by a.mid, a.scgrp, nvl(a.wstat,0)
                                            ) x
                                        join tmigcode y
                                            on x.mid = y.mid
                                        order by x.mid, x.scgrp, x.wstat)
                                    select mid																				                as mid		-- 이행코드
                                        , '0.전체'																			                as scgrp      -- 시나리오그룹
                                        , sum(xx.cnt1) 																		                as plancnt	-- 미수행
                                        , sum(xx.cnt2) 																		                as ingcnt		-- 수행중
                                        , sum(xx.cnt3) 																		                as comcnt		-- 완료
                                        , sum(xx.cnt4) 																		                as errcnt		-- 지연
                                        , sum(xx.cnt1)+sum(xx.cnt2)+sum(xx.cnt3)+sum(xx.cnt4) 								                as totcnt		-- Task
                                        , case when sum(xx.cnt1)+sum(xx.cnt2)+sum(xx.cnt3)+sum(xx.cnt4) = 0 then 0
    	                                        else round(sum(xx.cnt3)/((sum(xx.cnt1)+sum(xx.cnt2)+sum(xx.cnt3)+sum(xx.cnt4)))*100,2) end	as totrate	-- 비율(수행시나리오건수/총시나리오건수)
                                    from (
                                            select aa.mid
                                                , case aa.wstat when 0 then aa.wstat else '' end 		as wstat1
                                                , case aa.wstat when 0 then aa.cnt else 0 end 		    as cnt1
                                                , case aa.wstat when 0 then aa.scenario else 0 end 	    as scenario1
                                                , case aa.wstat when 1 then aa.wstat else '' end 		as wstat2
                                                , case aa.wstat when 1 then aa.cnt else 0 end 		    as cnt2
                                                , case aa.wstat when 1 then aa.scenario else 0 end 	    as scenario2
                                                , case aa.wstat when 2 then aa.wstat else '' end 		as wstat3
                                                , case aa.wstat when 2 then aa.cnt else 0 end 		    as cnt3
                                                , case aa.wstat when 2 then aa.scenario else 0 end 	    as scenario3
                                                , case aa.wstat when 3 then aa.wstat else '' end 		as wstat4
                                                , case aa.wstat when 3 then aa.cnt else 0 end 		    as cnt4
                                                , case aa.wstat when 3 then aa.scenario else 0 end 	    as scenario4
                                            from timg_tot aa
                                            ) xx
                                    group by xx.mid 
                                    union all
                                    select xx.mid																			                as mid		-- 이행코드
                                        , xx.scgrp																			                as scgrp    -- 시나리오그룹
                                        , sum(xx.cnt1) 																	                    as plancnt	-- 미수행
                                        , sum(xx.cnt2) 																	                    as ingcnt	-- 수행중
                                        , sum(xx.cnt3) 																	                    as comcnt	-- 완료
                                        , sum(xx.cnt4) 																	                    as errcnt	-- 지연
                                        , sum(xx.cnt1)+sum(xx.cnt2)+sum(xx.cnt3)+sum(xx.cnt4) 								                as totcnt	-- Task
                                        , case when sum(xx.cnt1)+sum(xx.cnt2)+sum(xx.cnt3)+sum(xx.cnt4) = 0 then 0
    	                                       else round(sum(xx.cnt3)/((sum(xx.cnt1)+sum(xx.cnt2)+sum(xx.cnt3)+sum(xx.cnt4)))*100,2) end	as totrate	-- 비율(수행시나리오건수/총시나리오건수)
                                    from (
                                            select aa.mid												as mid
                                                , aa.scgrp 											    as scgrp
                                                , case aa.wstat when 0 then aa.wstat else '' end 		as wstat1
                                                , case aa.wstat when 0 then aa.cnt else 0 end 			as cnt1
                                                , case aa.wstat when 0 then aa.scenario else 0 end 	    as scenario1
                                                , case aa.wstat when 1 then aa.wstat else '' end 		as wstat2
                                                , case aa.wstat when 1 then aa.cnt else 0 end 			as cnt2
                                                , case aa.wstat when 1 then aa.scenario else 0 end 	    as scenario2
                                                , case aa.wstat when 2 then aa.wstat else '' end 		as wstat3
                                                , case aa.wstat when 2 then aa.cnt else 0 end 			as cnt3
                                                , case aa.wstat when 2 then aa.scenario else 0 end 	    as scenario3
                                                , case aa.wstat when 3 then aa.wstat else '' end 		as wstat4
                                                , case aa.wstat when 3 then aa.cnt else 0 end 			as cnt4
                                                , case aa.wstat when 3 then aa.scenario else 0 end 	    as scenario4
                                            from timg aa
                                            ) xx
                                    group by xx.mid, xx.scgrp	                    
                                    `, [args.query.mid, args.query.mid]);
        return (rows);
    },
    /**
     * 이행 우측 세부 이행 시나리오
     * 테이블 List   
     */
    ttranssclist: async (args) => {
        // console.log("args.query.mid : " + args.query.mid);      
        // console.log("args.query.wstat : " + args.query.wstat);      

        let rows = await mondb.query(`   select ''			                        as flag         -- flag
                                     	    , '' 		                            as checked      -- checkbox
                                            , x.mid								    as mid          -- 이행코드
                                            , y.desc							    as tmignm       -- 이행설명
                                            , y.startDt							    as startdt      -- 이행시작일
                                            , y.endDt							    as endDt        -- 이행종료일
                                            , y.scenario 						    as scenario     -- 시나리오건수
                                            , y.mgb								    as mgb          -- 이행구분(1:리허설,2:본이행)
                                            , case y.mgb when 1 then '리허설' 
                                                        when 2 then '본이행' 
                                                        else '기타' end 			as mgbnm		-- 이행구분명
                                            , z.mclass							    as mclass       -- 시나리오그룹종류(1:사전준비,2:사전이행,3:본이행)
                                            , case z.mclass when 1 then '사전준비' 
                                                            when 2 then '사전이행' 
                                                            when 3 then '본이행' 
                                                            when 4 then '사후' 
                                                            else '기타' end 		as mclassnm     -- 시나리오그룹명
                                            , z.show                    			as disyn		-- display여부
                                            , x.scgrp							    as scgrp        -- 시나리오그룹
                                            , x.pkey							    as pkey         -- pkey
                                            , x.scno							    as scno         -- 시나리오코드
                                            , x.midnm							    as midnm        -- 작업설명
                                            , x.worknm							    as worknm       -- 세부작업내용
                                            , x.planStdt						    as planstdt     -- 계획(시작일시)
                                            , x.planEndt						    as planendt     -- 계획(종료일시)
                                            , x.ActStdt							    as actstdt      -- 시작일시
                                            , x.ActEndt							    as actendt      -- 종료일시
                                            , x.esttime							    as esttime      -- 예상소요시간
                                            , x.acttime							    as acttime      -- 실소요시간
                                            , x.wstat							    as wstat        -- 상태(0:계획,1:진행중,2:작업완료,3:작업오류,99:전체)
                                            , case x.wstat when 0 then '미수행'
                                                            when 1 then '진행중'
                                                            when 2 then '완료'
                                                            when 3 then '지연'
                                                            else '기타' end 		as wstatnm      -- 상태명
                                            , x.pscno								as pscno		-- 병행ID
                                            , x.cscno								as cscno		-- 선행ID
                                            , x.siusr								as siusr		-- SI등록자
                                            , x.smusr								as smusr		-- SM등록자
                                            , x.pserver							    as pserver		-- 수행서버
                                        from ( select a.pkey		    as pkey
                                                    , a.mid			    as mid
                                                    , a.scno		    as scno
                                                    , a.scgrp		    as scgrp
                                                    , a.desc		    as midnm
                                                    , a.worknm		    as worknm
                                                    , a.planStdt	    as planStdt
                                                    , a.planEndt	    as planEndt
                                                    , a.ActStdt		    as ActStdt
                                                    , a.ActEndt		    as ActEndt
                                                    , nvl(a.esttime,0)	as esttime
                                                    , nvl(a.acttime,0)	as acttime
                                                    , nvl(a.wstat,0)	as wstat
                                                    , a.pscno		    as pscno
                                                    , a.cscno		    as cscno
                                                    , a.siUsr		    as siusr
                                                    , a.smUsr		    as smusr
                                                    , a.pserver		    as pserver
                                                from tmigscene a
                                                where a.mid = ?
                                                and nvl(a.wstat,99) between (case ? when 99 then 0 else ? end) and (case ? when 99 then 99 else ? end)
                                            ) x
                                        join tmigcode y
                                            on x.mid = y.mid
                                        join tmigsgrp z
                                            on x.scgrp = z.scgrp
                                        where z.show = 0
                                        order by x.mid, x.scgrp, x.wstat	
                                    `, [args.query.mid, args.query.wstat, args.query.wstat, args.query.wstat, args.query.wstat]);
        return (rows);
    },
    /**
     * 이행 우측 세부 이행 시나리오 update
     * 
     */
    ttransscsave: async (args) => {
        var contact = JSON.parse(args);

        let msg = { message: 'post :' };
        let qstr = '';
        let qstr2 = '';
        let r = 1;
        let r2 = 1;

        try {
            let mid;
            let pkey;
            let actstst;
            let actendt;
            let wstat;

            for (var i = 0; i < contact.length; i++) {
                // console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
                // console.log(contact[i]); 		
                // console.log(contact[k].mid); 		
                // console.log(contact[k].pkey); 		
                // console.log(contact[k].actstst); 		
                // console.log(contact[k].actendt); 		
                // console.log(contact[k].wstat); 		

                mid = contact[i].mid;
                pkey = contact[i].pkey;
                actstst = contact[i].actstst;
                actendt = contact[i].actendt;
                wstat = contact[i].wstat;
                // console.log('mid : ' + mid); 		
                // console.log('pkey : ' + pkey); 		
                // console.log('actstst : ' + actstst); 		
                // console.log('actendt : ' + actendt); 		
                // console.log('actendt : ' + wstat); 		

                if (actstst === '') {
                    actstst = '1900-01-01';
                }

                if (actendt === '') {
                    actendt = '1900-01-01';
                }

                qstr = `update tmigscene 
                        set ActStdt=?
                          , ActEndt=?
                        where pkey = ? 
                        and mid = ?
                    ` ;

                r = mondb.query(qstr, [actstst, actendt, pkey, mid]);

                qstr2 = `update tmigscene 
                        set wstat = case when ActStdt = '1900-01-01' and ActEndt = '1900-01-01' then 0
                                         when ActStdt <> '1900-01-01' and ActEndt = '1900-01-01' then 1
                                         when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' and datediff(planEndt, ActEndt) <= 0 then 2
                                         when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' and datediff(planEndt, ActEndt) > 0 then 3
                                         else 2 end
                          , acttime = case when ActStdt = '1900-01-01' and ActEndt = '1900-01-01' then 0
                                           when ActStdt = '1900-01-01' and ActEndt <> '1900-01-01' then 0
                                           when ActStdt <> '1900-01-01' and ActEndt = '1900-01-01' then 0
                                           when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' then timestampdiff(hour, date_format(ActStdt, '%Y-%m-%d %H:%i:%s'), date_format(ActEndt, '%Y-%m-%d %H:%i:%s')) end
                        where pkey = ? 
                        and mid = ?
                    ` ;

                r2 = mondb.query(qstr2, [pkey, mid]);

            }
        } catch (e) {
            console.log(e.message);
            return (0);
        }

        return (1);

    },

    /**
     * 시나리오 Upload관리 Max Pkey 조회
     */
    ttmigscenemaxpkey: async () => {
        let rows = await mondb.query(`select ifnull(max(pkey), 0) as maxpkey from tmigscene`);
        return rows[0].maxpkey;
    },

    /**
     * 시나리오 Upload관리 전체 리스트
     */
    ttmigscenelist: async (args) => {
        let rows = await mondb.query(`select x.pkey as pkey, -- (update대상) pkey
       x.mid as mid, -- (update대상)이행코드
       x.cddesc as cddesc, -- 이행명
       x.mgb as mgb, -- mgb(1:리허설, 2:본이행)
       x.startdt as startdt, -- 시작일
       x.enddt as enddt, -- 종료일
       x.scenario as scenario, -- 시나리오건수
       x.apid as apid, -- (update대상)주제ID
       x.apnm as apnm, -- 주제명
       x.scno as scno, -- (update대상)시나리오코드
       x.scgrp as scgrp, -- (update대상)시나리오그룹
       x.planendt as planendt, -- (update대상)계획종료일시
       x.mclass as mclass, -- mclass(1:사전준비, 2:사전이행, 3:본이행)
       x.disyn as disyn, -- 화면출력여부(0:출력, 1:미출력)
       x.sidesc as sidesc, -- (update대상)작업설명
       x.worknm as worknm, -- (update대상)세부작업내용
       x.planstdt as planstdt, -- (update대상)계획시작일시
       x.actstot as actstdt, -- (update대상)시작일시
       x.actendt as actendt, -- (update대상) 종료일시
       x.esttime as esttime, -- (update대상)예상소요시간
       x.acttime as acttime, -- (update대상)실소요시간
       x.wstat as wstat, -- (update대상)상태(0:계획, 1:진행중, 2:완료, 3:미수행)
       x.wstatnm as wstatnm, -- 상태명
       x.pscno as pscno, -- (update대상) 선행ID
       x.cscno as cscno, -- (update대상)병행ID
       x.siusr as siusr, -- (update대상)SI담당자
       x.smusr as smusr, -- (update대상)SM담당자
       x.pserver as pserver -- (update대상)수행서버
from (
    select c.pkey as pkey, -- (update대상) pkey
          c.mid as mid, -- (update대상)이행코드
          a.desc as cddesc, -- 이행명
          a.mgb as mgb, -- mgb(1:리허설, 2:본이행)
          a.startDt as startdt, -- 시작일
          a.endDt as enddt, -- 종료일
          a.scenario as scenario, -- 시나리오건수
          c.apid as apid, -- (update대상)주제ID
          d.apnm as apnm, -- 주제명
          c.scno as scno, -- (update대상)시나리오코드
          c.scgrp as scgrp, -- (update대상)시나리오그룹
          b.mclass as mclass, -- mclass(1:사전준비, 2:사전이행, 3:본이행)
          b.show as disyn, -- 화면출력여부(0:출력, 1:미출력)
          c.desc as sidesc, -- (update대상)작업설명
          c.worknm as worknm, -- (update대상)세부작업내용
          c.planStdt as planstdt, -- (update대상)계획시작일시
          c.planEndt as planendt, -- (update대상)계획종료일시
          c.ActStdt as actstot, -- (update대상)시작일시
          c.ActEndt as actendt, -- (update대상) 종료일시
          c.esttime as esttime, -- (update대상)예상소요시간
          c.acttime as acttime, -- (update대상)실소요시간
          c.wstat as wstat, -- (update대상)상태(0:계획, 1:진행중, 2:완료, 3:미수행)
          case c.wstat when 0 then '계획'
                        when 1 then '진행중'
                        when 2 then '완료'
                        when 3 then '미수행' end as wstatnm, -- 상태명
          c.pscno as pscno, -- (update대상) 선행ID
          c.cscno as cscno, -- (update대상)병행ID
          c.siusr as siusr, -- (update대상)SI담당자
          c.smUsr as smusr, -- (update대상)SM담당자
          c.pserver as pserver -- (update대상)수행서버
    from tmigscene c
    join tmigsgrp b on b.scgrp = c.scgrp
    join tmigcode a on a.mid = c.mid
    left outer join tapid d on c.apid = d.apid
) x
order by cddesc, scgrp, scno 
        `);

        return (rows);
    },

    /**
     * 시나리오 Upload관리 관리 검색
     */
    ttmigscenesearch: async (args) => {
        const { gubun, searchtxt, cddesc, date } = args;

        // Base Query (Wrapped in x)
        const baseQuery = `
            select x.pkey as pkey,
                   x.mid as mid,
                   x.cddesc as cddesc,
                   x.mgb as mgb,
                   x.startdt as startdt,
                   x.enddt as enddt,
                   x.scenario as scenario,
                   x.apid as apid,
                   x.apnm as apnm,
                   x.scno as scno,
                   x.scgrp as scgrp,
                   x.mclass as mclass,
                   x.disyn as disyn,
                   x.sidesc as sidesc,
                   x.worknm as worknm,
                   x.planstdt as planstdt,
                   x.planendt as planendt,
                   x.actstdt as actstdt,
                   x.actendt as actendt,
                   x.esttime as esttime,
                   x.acttime as acttime,
                   x.wstat as wstat,
                   x.pscno as pscno,
                   x.cscno as cscno,
                   x.siusr as siusr,
                   x.smusr as smusr,
                   x.pserver as pserver
            from (select c.pkey as pkey,
                         c.mid as mid,
                         a.desc as cddesc,
                         a.mgb as mgb,
                         a.startDt as startdt,
                         a.endDt as enddt,
                         a.scenario as scenario,
                         c.apid as apid,
                         d.apnm as apnm,
                         c.scno as scno,
                         c.scgrp as scgrp,
                         b.mclass as mclass,
                         b.show as disyn,
                         c.desc as sidesc,
                         c.worknm as worknm,
                         c.planStdt as planstdt,
                         c.planEndt as planendt,
                         c.ActStdt as actstdt,
                         c.ActEndt as actendt,
                         c.esttime as esttime,
                         c.acttime as acttime,
                         c.wstat as wstat,
                         c.pscno as pscno,
                         c.cscno as cscno,
                         c.siUsr as siusr,
                         c.smUsr as smusr,
                         c.pserver as pserver
                  from tmigscene c
                  join tmigsgrp b on b.scgrp = c.scgrp
                  join tmigcode a on a.mid = c.mid
                  left outer join tapid d on c.apid = d.apid
            ) x
        `;

        let whereClauses = ["1=1"];
        let params = [];

        // 1. Fixed Filters (Composite)
        // Scenario Name Dropdown Filter
        if (cddesc && cddesc.trim() !== "") {
            whereClauses.push("x.cddesc = ?");
            params.push(cddesc);
        }

        // Performance Date Dropdown Filter
        /* if (date && date.trim() !== "") {
             whereClauses.push("x.enddt >= date_format(?, '%Y-%m-%d %T')");
             whereClauses.push("x.enddt < DATE_ADD(date_format(?, '%Y-%m-%d %T'), INTERVAL 1 day)");
             params.push(date, date);
         }
 */
        // 2. Generic Search Filter
        if (searchtxt && searchtxt.trim() !== "") {
            if (gubun == 2) { // Scenario Group
                whereClauses.push("x.scgrp like concat('%', ?, '%')");
                params.push(searchtxt);
            } else if (gubun == 3) { // Work Description
                whereClauses.push("x.sidesc like concat('%', ?, '%')");
                params.push(searchtxt);
            } else if (gubun == 4) { // End Date
                whereClauses.push("x.enddt >= date_format(?, '%Y-%m-%d %T')");
                whereClauses.push("x.enddt < DATE_ADD(date_format(?, '%Y-%m-%d %T'), INTERVAL 1 day)");
                params.push(searchtxt, searchtxt);
            } else if (gubun == 6) { // Start Date
                whereClauses.push("x.startdt >= date_format(?, '%Y-%m-%d %T')");
                whereClauses.push("x.startdt < DATE_ADD(date_format(?, '%Y-%m-%d %T'), INTERVAL 1 day)");
                params.push(searchtxt, searchtxt);
            } else if (gubun == 5) { // Status (wstat)
                whereClauses.push("x.wstat like concat('%', ?, '%')");
                params.push(searchtxt);
            } else { // Default (e.g. gubun 1 or others)
                // Search mainly by Scenario Name as per original logic, or mixed?
                // Original used cddesc for gubun 1/default.
                whereClauses.push("x.cddesc like concat('%', ?, '%')");
                params.push(searchtxt);
            }
        }

        const finalQuery = `${baseQuery} WHERE ${whereClauses.join(' AND ')} ORDER BY cddesc, scgrp, scno`;

        let rows = await mondb.query(finalQuery, params);
        return rows;
    },

    /**
     * 시나리오 Upload관리 삭제
     */
    ttmigscenedel: async (args) => {
        var contact = JSON.parse(args);
        let msg = { message: 'post :' };
        let qstr = "";
        let r = 0;
        try {
            let pkey = 0;
            for (var i = 0; i < contact.length; i++) {
                console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
                // console.log(contact[i]);
                // console.log(contact[k].mid);
                pkey = contact[i].pkey;
                // console.log('pkey:' + pkey);
                qstr = `delete from tmigscene where pkey = ?`;
                r = mondb.query(qstr, [pkey]);
            }
        } catch (e) {
            console.log(e.message);
            return (0);
        }

        return (1);
    },

    /**
     * 시나리오 Upload관리 저장
     */
    ttmigscenesave: async (args) => {
        var contact = JSON.parse(args);
        let msg = { message: 'post :' };
        let qstr = "";
        let r = 0;
        let qstr2 = "";
        let r2 = 0;
        let pkey = 0;
        let mid = 0;
        let apid = 0;
        let scno = "";
        let scgrp = "";
        let desc = "";
        let worknm = "";
        let planstdt = "";
        let planendt = "";
        let actstdt = "";
        let actendt = "";
        let esttime = 0;
        let acttime = 0;
        let wstat = 0;
        let pscno = "";
        let cscno = "";
        let siusr = "";
        let smusr = "";
        let pserver = "";
        try {
            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
            // console.log('contact.length: ' + contact.length);
            for (var i = 0; i < contact.length; i++) {
                // console.log(contact[i]);
                pkey = contact[i].pkey;
                mid = contact[i].mid;
                apid = contact[i].apid;
                scno = contact[i].scno;
                scgrp = contact[i].scgrp;
                desc = contact[i].cddesc;
                worknm = contact[i].worknm;
                planstdt = contact[i].planstdt;
                planendt = contact[i].planendt;
                actstdt = contact[i].actstdt;
                actendt = contact[i].actendt;
                esttime = contact[i].esttime;
                acttime = contact[i].acttime;
                wstat = contact[i].wstat;
                pscno = contact[i].pscno;
                cscno = contact[i].cscno;
                siusr = contact[i].siusr;
                smusr = contact[i].smusr;
                pserver = contact[i].pserver;
                // console.log('pkey:' + pkey);
                // console.log('mid: ' + mid);
                // console.log('apid: ' + apid);
                // console.log('scno: ' + scno);
                // console.log('scgrp: ' + scgrp);
                // console.log('desc: ' + desc);
                // console.log('worknm: ' + worknm);
                // console.log('planstdt: ' + planstdt);
                // console.log('planendt: ' + planendt);
                // console.log('actstdt:' + actstdt);
                // console.log('actendt: ' + actendt);
                // console.log('esttime:' + esttime);
                // console.log('acttime:' + acttime);
                // console.log('wstat: ' + wstat);
                // console.log('pscno: ' + pscno);
                // console.log('cscno: ' + cscno);
                // console.log('siusr: ' + siusr);
                // console.log('smusr: ' + smusr);
                // console.log('pserver: ' + pserver);

                if (mid === "") {
                    mid = 0;
                }
                if (apid === "") {
                    apid = 0;
                }
                if (planstdt === "") {
                    planstdt = '1900-01-01';
                }
                if (planendt === "") {
                    planendt = '1900-01-01';
                }
                if (actstdt === "") {
                    actstdt = '1900-01-01';
                }
                if (actendt === "") {
                    actendt = '1900-01-01';
                }
                if (isNaN(Number(mid))) {
                    mid = 0;
                }
                if (isNaN(Number(apid))) {
                    apid = 0;
                }
                if (esttime === "") {
                    esttime = 0;
                }
                if (acttime === '') {
                    acttime = 0;
                }
                if (wstat === "") {
                    wstat = 0;
                }

                // pkey 존재 여부 확인
                let checkQuery = `select count(*) as cnt from tmigscene where pkey = ?`;
                let checkResult = await mondb.query(checkQuery, [pkey]);
                let exists = checkResult[0].cnt > 0;

                if (!exists) {
                    qstr = `insert into
                            tmigscene(pkey, mid,apid, scno,scgrp, \`desc\`, worknm,planStdt,planEndt, ActStdt, ActEndt, esttime, acttime, wstat, pscno, cscno, siusr,smusr,pserver)
                            values (?, ifnull(?,0),ifnull(?,0), ifnull(?,""), ifnull(?,""), ifnull(?,""), ifnull(?,"")
                            ,ifnull(?,'1900-01-01'), ifnull(?,'1900-01-01'), ifnull(?,'1900-01-01'), ifnull(?,'1900-01-01'), ifnull(?,0), ?, ifnull(?,0), ?, ?, ?, ?, ?) `;
                    r = await mondb.query(qstr,
                        [pkey, mid, apid, scno, scgrp, desc, worknm, planstdt, planendt, actstdt, actendt, esttime, acttime, wstat, pscno, cscno, siusr, smusr, pserver]);

                    qstr2 = `update tmigscene
                             set wstat = case when ActStdt = '1900-01-01' and ActEndt = '1900-01-01' then 0
                                              when ActStdt <> '1900-01-01' and ActEndt = '1900-01-01' then 1
                                              when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' and datediff(planEndt, ActEndt) <= 0 then 2
                                              when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' and datediff(planEndt, ActEndt) > 0 then 3
                                              else 2 end
                                , acttime = case when ActStdt = '1900-01-01' and ActEndt = '1900-01-01' then 0
                                                 when ActStdt = '1900-01-01' and ActEndt <> '1900-01-01' then 0
                                                 when ActStdt <> '1900-01-01' and ActEndt = '1900-01-01' then 0
                                                 when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' then timestampdiff(hour,
                                                               date_format(ActStdt, '%Y-%m-%d %H:%i:%s'), date_format(ActEndt, '%Y-%m-%d %H:%i:%s')) end
                             where pkey = ?`;
                    r2 = await mondb.query(qstr2, [pkey]);
                } else {
                    qstr = `update tmigscene x
                            set mid = ifnull(?,0)
                              , apid = ifnull(?,0)
                              , scno = ifnull(?,"")
                              , scgrp = ifnull(?,"")
                              , x.desc = ifnull(?,"")
                              , worknm = ifnull(?,"")
                              , planStdt = ifnull(?,'1900-01-01')
                              , planEndt = ifnull(?,'1900-01-01')
                              , ActStdt = ifnull(?,'1900-01-01')
                              , ActEndt = ifnull(?,'1900-01-01')
                              , esttime = ifnull(?,0)
                              , acttime = ifnull(?,0)
                              , wstat = ifnull(?,0)
                              , pscno = ?
                              , cscno = ?
                              , siUsr = ?
                              , smUsr = ?
                              , pserver = ?
                            where pkey = ?`;
                    r = await mondb.query(qstr,
                        [mid, apid, scno, scgrp, desc, worknm, planstdt, planendt, actstdt, actendt, esttime, acttime, wstat, pscno, cscno, siusr, smusr, pserver, pkey]);

                    qstr2 = `update tmigscene
                             set wstat = case when ActStdt = '1900-01-01' and ActEndt = '1900-01-01' then 0
                                              when ActStdt <> '1900-01-01' and ActEndt = '1900-01-01' then 1
                                              when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' and datediff(planEndt, ActEndt) <= 0 then 2
                                              when ActStdt <> '1900-01-01' and ActEndt <> '1900-01-01' and datediff(planEndt, ActEndt) > 0 then 3
                                              else 2 end
                                , acttime = case when ActStdt = '1900-01-01' and ActEndt = '1900-01-01' then 0
                                                 when ActStdt = '1900-01-01' and ActEndt<> '1900-01-01' then 0
                                                 when ActStdt<> '1900-01-01' and ActEndt = '1900-01-01' then 0
                                                 when ActStdt<> '1900-01-01' and ActEndt<> '1900-01-01' then timestampdiff(hour,
                    date_format(ActStdt, '%Y-%m-%d %H:%i:%s'), date_format(ActEndt, '%Y-%m-%d %H:%i:%s')) end
                             where pkey = ? `;
                    r2 = await mondb.query(qstr2, [pkey]);
                }
            }
            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        } catch (e) {
            console.log(e.message);
            return (0);
        }

        return (1);
    },

    ttmigsceneseldata: async (args) => {
        let rows = 0;
        rows = await mondb.query('SELECT * FROM tmigcode;');
        return (rows);
    },
}

export default tmigscene;