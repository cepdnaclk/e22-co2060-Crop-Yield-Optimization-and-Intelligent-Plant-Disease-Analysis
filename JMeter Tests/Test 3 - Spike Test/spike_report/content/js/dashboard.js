/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 71.280276816609, "KoPercent": 28.719723183391004};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.17162629757785466, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.20625, 500, 1500, "GET - All Farms (/api/farms)"], "isController": false}, {"data": [0.0, 500, 1500, "POST - Spike Surge Login"], "isController": false}, {"data": [0.2, 500, 1500, "POST - Baseline Login"], "isController": false}, {"data": [0.21150097465886938, 500, 1500, "GET - Harvest History (/api/farms/harvests)"], "isController": false}, {"data": [0.09126984126984126, 500, 1500, "POST - Submit Inquiry (/api/inquiries)"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1445, 415, 28.719723183391004, 5609.6892733563955, 252, 44956, 1959.0, 19381.400000000016, 31571.1, 41846.92, 7.192847969575996, 15.787282410126734, 3.9855634376835543], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["GET - All Farms (/api/farms)", 560, 151, 26.964285714285715, 4646.353571428568, 252, 43531, 1487.0, 10103.200000000008, 27999.799999999945, 41336.77, 2.8286542677321265, 6.811100944757898, 1.5862444374008708], "isController": false}, {"data": ["POST - Spike Surge Login", 115, 41, 35.65217391304348, 23601.895652173913, 1984, 44956, 23931.0, 40662.0, 42411.19999999999, 44872.16, 2.1226328029827606, 4.121613593155894, 0.421498348037949], "isController": false}, {"data": ["POST - Baseline Login", 5, 0, 0.0, 1493.8, 1027, 2208, 1523.0, 2208.0, 2208.0, 2208.0, 1.0078613182826044, 1.3060859075791171, 0.3110197036887724], "isController": false}, {"data": ["GET - Harvest History (/api/farms/harvests)", 513, 123, 23.976608187134502, 3782.04873294347, 311, 43313, 1408.0, 5366.600000000002, 21261.499999999985, 40082.08000000001, 2.612774583254814, 7.270917476049567, 1.5359958401878346], "isController": false}, {"data": ["POST - Submit Inquiry (/api/inquiries)", 252, 100, 39.682539682539684, 3341.9246031746015, 253, 41821, 2297.5, 4630.600000000003, 16464.449999999997, 27216.369999999995, 4.191616766467066, 2.757408360362608, 2.672649492681304], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["403/Forbidden", 335, 80.72289156626506, 23.18339100346021], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 80, 19.27710843373494, 5.536332179930795], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1445, 415, "403/Forbidden", 335, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 80, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["GET - All Farms (/api/farms)", 560, 151, "403/Forbidden", 126, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 25, "", "", "", "", "", ""], "isController": false}, {"data": ["POST - Spike Surge Login", 115, 41, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 41, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["GET - Harvest History (/api/farms/harvests)", 513, 123, "403/Forbidden", 110, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 13, "", "", "", "", "", ""], "isController": false}, {"data": ["POST - Submit Inquiry (/api/inquiries)", 252, 100, "403/Forbidden", 99, "Non HTTP response code: java.net.SocketTimeoutException/Non HTTP response message: Read timed out", 1, "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
