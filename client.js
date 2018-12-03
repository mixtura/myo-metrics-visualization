const visContainerEl = document.getElementById('visualization');
const processIdsSelectEl = document.getElementById('processIds');
const measurementsSelectEl = document.getElementById('measurements');
const itemsContentContentEl = document.getElementById('itemsContent');
const timeline = new Timeline(onItemsSelect);

function onItemsSelect(items) {
  const data = items.map(x => ({
    event: x.EventId,
    start: x.start,
    data: JSON.parse(x.CustomData)
  }));

  const contentTextNode = document.createTextNode(JSON.stringify(data, null, 40));

  itemsContentContentEl.innerHTML = '';
  itemsContentContentEl.appendChild(contentTextNode);
}

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

const fetchMeasurements = () =>
  fetch('/api/measurements')
    .then(response => {
      if (response.status !== 200) {
        console.log(response);
      }
      return response;
    })
    .then(response => response.json());

const fetchProcessIds = (measurement) => 
  fetch(`/api/processids?measurement=${measurement}`)
    .then(response => {
      if (response.status !== 200) {
        console.log(response);
      }
      return response;
    })
    .then(response => response.json());

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
  
const prepareData = raw => 
  raw.map(x => ({ 
    ...x, 
    id: x.time, 
    start: x.time, 
    content: x.EventId })
  );

bindEvents(processIdsSelectEl, measurementsSelectEl);

function bindEvents(processIdsSelectEl, measurementsSelectEl) {
  const getSelectedValue = (target) => target.options[target.selectedIndex].value;
  const getDropdownLoader = (target) => (values) => fulfillOptions(target, values)

  document.addEventListener(
    'DOMContentLoaded', 
    () => fetchMeasurements().then(getDropdownLoader(measurementsSelectEl))
  );

  measurementsSelectEl.addEventListener('change', () => {
    const measurement = getSelectedValue(measurementsSelectEl);

    processIdsSelectEl.innerHTML = '';

    fetchProcessIds(measurement).then(getDropdownLoader(processIdsSelectEl));
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
    loadDataIntervalHandler = setInterval(() => loadData(), 3000);
    loadData();
  });
}

function Timeline(onItemsSelect) {
  const options = {
    height: 500,
    multiselect: true
  };

  const init = (data) => {
    this.items = new vis.DataSet(data);
      this.timeline = new vis.Timeline(visContainerEl, this.items, options);
      this.timeline.on('select', (props) => {
        const items = this.items.get().filter(x => props.items.includes(x.id));
        onItemsSelect(items);
      });
  };

  this.clear = () => {
    if (this.items) {
      this.items.clear();
    }
  };

  this.setData = (data) => {
    if (!this.items) {
      init(data);
    } else {
      data.forEach(x => this.items.update(x));
    }
  };
}