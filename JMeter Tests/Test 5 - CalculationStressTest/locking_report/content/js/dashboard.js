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

    var data = {"OkPercent": 93.87755102040816, "KoPercent": 6.122448979591836};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.4352769679300292, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "POST - Farmer Login"], "isController": false}, {"data": [0.0, 500, 1500, "POST - Reader Login"], "isController": false}, {"data": [0.0, 500, 1500, "POST - Admin Login"], "isController": false}, {"data": [0.4658333333333333, 500, 1500, "GET - Read Under Locking (/api/farms)"], "isController": false}, {"data": [0.4866666666666667, 500, 1500, "POST - Concurrent Farmer Write (/api/inquiries)"], "isController": false}, {"data": [0.0, 500, 1500, "POST - Bulk Avg Yield Recalculation (/api/avg-yields)"], "isController": false}, {"data": [0.4741666666666667, 500, 1500, "GET - Read Harvests Under Locking (/api/farms/harvests)"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 1715, 105, 6.122448979591836, 1120.1772594752194, 253, 6843, 1024.0, 1416.0000000000005, 2231.19999999999, 4937.359999999995, 15.773886170486737, 38.767080951537835, 11.328498652551414], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["POST - Farmer Login", 15, 0, 0.0, 3972.666666666667, 1900, 5842, 4040.0, 5773.6, 5842.0, 5842.0, 0.7647208768799388, 0.9910005894723427, 0.23598808309966865], "isController": false}, {"data": ["POST - Reader Login", 20, 0, 0.0, 3805.6500000000005, 1591, 6843, 3480.5, 6683.600000000002, 6840.5, 6843.0, 1.0309278350515465, 1.3359777706185567, 0.3181378865979382], "isController": false}, {"data": ["POST - Admin Login", 5, 5, 100.0, 1656.8, 1006, 2140, 1646.0, 2140.0, 2140.0, 2140.0, 0.505510059650187, 0.25176770548983923, 0.15599724497017492], "isController": false}, {"data": ["GET - Read Under Locking (/api/farms)", 600, 0, 0.0, 1165.8799999999997, 949, 5394, 1032.0, 1370.0, 1597.349999999999, 3864.1400000000017, 5.771061971587138, 17.048303187549894, 4.035234737945695], "isController": false}, {"data": ["POST - Concurrent Farmer Write (/api/inquiries)", 375, 0, 0.0, 841.8293333333326, 488, 5377, 596.0, 1186.4000000000005, 2294.999999999999, 4431.040000000002, 8.130610120983478, 6.391739401749708, 7.050763464290361], "isController": false}, {"data": ["POST - Bulk Avg Yield Recalculation (/api/avg-yields)", 100, 100, 100.0, 583.47, 253, 4070, 328.0, 910.2000000000002, 2660.199999999988, 4068.239999999999, 1.7646643608385684, 0.8754389602597586, 0.8788855703395214], "isController": false}, {"data": ["GET - Read Harvests Under Locking (/api/farms/harvests)", 600, 0, 0.0, 1172.5933333333323, 952, 5195, 1033.0, 1348.6999999999998, 1527.9499999999998, 4787.880000000001, 5.818746060224021, 19.88260982883189, 4.119717669592203], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["403/Forbidden", 100, 95.23809523809524, 5.830903790087463], "isController": false}, {"data": ["404/Not Found", 5, 4.761904761904762, 0.2915451895043732], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 1715, 105, "403/Forbidden", 100, "404/Not Found", 5, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["POST - Admin Login", 5, 5, "404/Not Found", 5, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["POST - Bulk Avg Yield Recalculation (/api/avg-yields)", 100, 100, "403/Forbidden", 100, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
