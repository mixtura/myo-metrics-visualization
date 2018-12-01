const visContainerEl = document.getElementById('visualization');
const processIdsSelectEl = document.getElementById('processIds');
const measurementsSelectEl = document.getElementById('measurements');
const itemsContentContentEl = document.getElementById('itemsContent');

const onItemsSelect = (items) => {
  const data = items.map(x => ({
    event: x.EventId,
    start: x.start,
    data: JSON.parse(x.CustomData)
  }));

  const contentTextNode = document.createTextNode(JSON.stringify(data, null, 40));

  itemsContentContentEl.innerHTML = '';
  itemsContentContentEl.appendChild(contentTextNode);
}

const timeline = (function timeline(onItemsSelect) {
  const timeline = {};
  const options = {
    height: 500,
    multiselect: true
  };

  timeline.clear = () => {
    if (timeline.items) {
      timeline.items.clear();
    }
  }

  timeline.setData = (data) => {
    if (!timeline.items) {
      timeline.items = new vis.DataSet(data);
      timeline.timeline = new vis.Timeline(visContainerEl, timeline.items, options);
      timeline.timeline.on('select', (props) => {
        let items = timeline.items.get().filter(x => props.items.includes(x.id));
        onItemsSelect(items);
      });
    } else {
      data.forEach(x => timeline.items.update(x));
    }
  }

  return timeline;
})(onItemsSelect);

const fulfillOptions = (selectEl, data) => {
  // append empty
  selectEl.appendChild(document.createElement('option'));

  data.forEach(x => {
    let option = document.createElement('option');

    option.setAttribute("value", x);
    option.innerText = x;

    selectEl.appendChild(option);
  });
}

const buildQueryString = params => 
  Object
    .keys(params)
    .filter(key => params[key])
    .map(key => `${key}=${params[key]}`)
    .join('&');

const loadMeasurements = (measurementsSelectEl) => {
  fetch('/api/measurements')
    .then(response => {
      if (response.status !== 200) {
        console.log(response);
      }
      return response;
    })
    .then(response => response.json())
    .then(parsedResponse =>
      fulfillOptions(measurementsSelectEl, parsedResponse));
}

const loadProcessIds = (processIdsSelectEl, measurement) => {
  fetch(`/api/processids?measurement=${measurement}`)
    .then(response => {
      if (response.status !== 200) {
        console.log(response);
      }
      return response;
    })
    .then(response => response.json())
    .then(parsedResponse =>
      fulfillOptions(processIdsSelectEl, parsedResponse));
}

const prepareData = raw => {
  const groupBy = (list, keyGetter) => {
    const map = new Map();

    list.forEach((item) => {
      const key = keyGetter(item);
      const collection = map.get(key);
      if (!collection) {
        map.set(key, [item]);
      } else {
        collection.push(item);
      }
    });

    return Array.from(map.values());
  }

  return groupBy(raw, x => x.ProcessId)
    .flatMap(events => 
      events.map(x => ({ 
        ...x, 
        id: x.time, 
        start: x.time, 
        content: x.EventId })
    ));
}

const fetchData = (measurement, processId, from) =>
  fetch(`/api/logs?${buildQueryString({measurement, processId, from})}`)
    .then(response => {
      if (response.status !== 200) {
        console.log(response);
      }
      return response;
    })
    .then(response => response.json())
    .then(prepareData)
    .catch(error => console.log(error));

function bindEvents(processIdsSelectEl, measurementsSelectEl) {
  const getSelectedValue = (target) => target.options[target.selectedIndex].value;

  document.addEventListener('DOMContentLoaded', () => loadMeasurements(measurementsSelectEl));

  measurementsSelectEl.addEventListener('change', () => {
    const measurement = getSelectedValue(measurementsSelectEl);

    processIdsSelectEl.innerHTML = '';
    loadProcessIds(processIdsSelectEl, measurement);
  });

  let loadDataIntervalHandler;

  processIdsSelectEl.addEventListener('change', () => {
    let processId = getSelectedValue(processIdsSelectEl);
    let measurement = getSelectedValue(measurementsSelectEl);

    timeline.clear();

    let from = null;
    let loadData = () => fetchData(measurement, processId, from)
      .then(data => {
        from = data[data.length - 1].time;
        timeline.setData(data)
      });

    loadDataIntervalHandler && clearInterval(loadDataIntervalHandler);
    loadDataIntervalHandler = setInterval(() => loadData(), 1000);
  });
}

bindEvents(processIdsSelectEl, measurementsSelectEl);