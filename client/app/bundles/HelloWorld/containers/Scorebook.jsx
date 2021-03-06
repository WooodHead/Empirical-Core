import React from 'react';
import Scrollify from '../components/modules/scrollify';
import $ from 'jquery';
import request from 'request';
import _ from 'underscore';
import TableFilterMixin from '../components/general_components/table/sortable_table/table_filter_mixin.js';
import StudentScores from '../components/scorebook/student_scores';
import LoadingIndicator from '../components/shared/loading_indicator';
import ScorebookFilters from '../components/scorebook/scorebook_filters';
import ScoreLegend from '../components/scorebook/score_legend';
import AppLegend from '../components/scorebook/app_legend.jsx';
import EmptyProgressReport from '../components/shared/EmptyProgressReport';
import moment from 'moment'

export default React.createClass({

  DATE_RANGE_FILTER_OPTIONS: [
    {
      title: 'Today',
      beginDate: moment()
    },
    {
      title: 'This Week',
      beginDate: moment().startOf('week')
    },
    {
      title: 'This Month',
      beginDate: moment().startOf('month')
    },
    {
      title: 'Last 7 days',
      beginDate: moment().subtract(7, 'days')
    },
    {
      title: 'Last 30 days',
      beginDate: moment().subtract(1, 'months')
    },
    {
      title: 'All Time',
      beginDate: null
    },
  ],

  mixins: [TableFilterMixin],

  getInitialState() {
    this.modules = {
      scrollify: new Scrollify(),
    };
    const allActivityPacksUnit = {
      name: 'All Activity Packs',
      value: '',
    }
    return {
      units: [],
      classrooms: this.props.allClassrooms,
      selectedUnit: allActivityPacksUnit,
      selectedClassroom: this.props.selectedClassroom,
      classroomFilters: this.props.allClassrooms,
      unitFilters: [],
      scores: new Map(),
      beginDate: null,
      premium_state: this.props.premium_state,
      endDate: null,
      currentPage: 0,
      loading: false,
      is_last_page: false,
      noLoadHasEverOccurredYet: true,
      anyScoresHaveLoadedPreviously: localStorage.getItem('anyScoresHaveLoadedPreviously') || false
    };
  },

  componentDidMount() {
    this.setStateFromLocalStorage(this.fetchData);
    if(this.props.selectedClassroom) {
      this.getUpdatedUnits(this.props.selectedClassroom.value);
    }
    this.modules.scrollify.scrollify('#page-content-wrapper', this);
  },

  formatDate(date) {
    if (date) {
      const standardizedDate = moment.utc(date)
      return `${standardizedDate.year()}-${standardizedDate.month() + 1}-${standardizedDate.date()}`;
    }
  },

  setStateFromLocalStorage(callback) {
    let state = {}
    const storedSelectedClassroomId = window.localStorage.getItem('scorebookSelectedClassroomId')
    const storedDateFilterName = window.localStorage.getItem('scorebookDateFilterName')
    const dateFilterName = !storedDateFilterName || storedDateFilterName === 'null' ? null : storedDateFilterName
    const selectedClassroomId = !storedSelectedClassroomId || storedSelectedClassroomId === 'null' ? null : storedSelectedClassroomId
    if (selectedClassroomId) {
      const selectedClassroom = this.state.classrooms.find(c => c.id === selectedClassroomId)
      if (selectedClassroom) {
        state.selectedClassroom = selectedClassroom
      }
    }
    if (dateFilterName) {
      const beginDate = this.DATE_RANGE_FILTER_OPTIONS.find(o => o.title === dateFilterName).beginDate
      window.localStorage.setItem('scorebookBeginDate', beginDate);
      state.beginDate = beginDate
      state.dateFilterName = dateFilterName
      this.setState(state, callback)
    } else {
      state.beginDate = this.convertStoredDateToMoment(window.localStorage.getItem('scorebookBeginDate'))
      this.setState(state, callback)
    }
  },

  fetchData() {
    const newCurrentPage = this.state.currentPage + 1;
    this.setState({ loading: true, currentPage: newCurrentPage, });
    if(!this.state.selectedClassroom) {
      this.setState({ missing: 'classrooms' });
      return;
    }
    $.ajax({
      url: '/teachers/classrooms/scores',
      data: {
        current_page: newCurrentPage,
        classroom_id: this.state.selectedClassroom.value,
        unit_id: this.state.selectedUnit.value,
        begin_date: this.formatDate(this.state.beginDate),
        end_date: this.formatDate(this.state.endDate),
        no_load_has_ever_occurred_yet: this.state.noLoadHasEverOccurredYet,
      },
      success: this.displayData,
    });
  },

  getUpdatedUnits(classroomId) {
    const loadingUnit = { name: 'Loading...', value: '', };
    this.setState({ unitFilters: [loadingUnit], selectedUnit: loadingUnit, });
    const that = this;
    request.get({
      url: `${process.env.DEFAULT_URL}/teachers/classrooms/${classroomId}/units`,
    }, (error, httpStatus, body) => {
      const parsedBody = JSON.parse(body);
      const units = parsedBody.units
      if (units.length === 1) {
        const selectedUnit = units[0]
        that.setState({
          unitFilters: units,
          selectedUnit: selectedUnit,
          missing: this.checkMissing(this.state.scores)
        });
      } else {
        const selectedUnit = { name: 'All Activity Packs', value: '', }
        that.setState({
          unitFilters: [selectedUnit].concat(units),
          selectedUnit: selectedUnit,
          missing: this.checkMissing(this.state.scores)
        });
      }
    });
  },

  checkMissing(scores) {
    if(!(this.state.anyScoresHaveLoadedPreviously == 'true') && scores.size > 0) {
      this.setState({anyScoresHaveLoadedPreviously: true});
      localStorage.setItem('anyScoresHaveLoadedPreviously', true);
    }
    if (!this.state.classroomFilters || this.state.classroomFilters.length === 0) {
      return 'classrooms';
    } else if(this.state.anyScoresHaveLoadedPreviously == 'true' && (!scores || scores.size === 0)) {
      return 'activitiesWithinDateRange';
    } else if (this.state.unitFilters.length && (!scores || scores.size === 0)) {
      return 'students';
    } else if (!scores || scores.size === 0) {
      return 'activities';
    }
  },

  displayData(data) {
    let num = 0
    data.scores.forEach(s => s.user_id === "1637709" ? num++ : null)
    this.setState({
      classroomFilters: this.props.allClassrooms,
      is_last_page: data.is_last_page,
      premium_state: data.premium_state,
      noLoadHasEverOccurredYet: false,
    });
    const newScores = new Map(this.state.scores);
    data.scores.forEach((s) => {
      // add the score to the user scores arr or create a new one
      newScores.has(s.user_id) || newScores.set(s.user_id, { name: s.name, scores: [], });
      const scores = newScores.get(s.user_id).scores;
      scores.push({
        caId: s.ca_id,
        // activitySessionId: s.id,
        userId: s.user_id,
        updated: s.updated_at,
        name: s.activity_name,
        percentage: s.percentage,
        started: s.started ? Number(s.started) : 0,
        started_at: s.started_at,
        completed_attempts: s.completed_attempts ? Number(s.completed_attempts) : 0,
        marked_complete: s.marked_complete,
        activity_description: s.activity_description,
        activity_classification_id: s.activity_classification_id
      });
    });
    console.log(data.is_last_page)
    this.setState({ loading: false, scores: newScores, missing: this.checkMissing(newScores), });
  },

  selectUnit(option) {
    this.setState({
      scores: new Map(),
      currentPage: 0,
      selectedUnit: option,
    }, this.fetchData);
  },

  selectClassroom(option) {
    window.localStorage.setItem('scorebookSelectedClassroomId', option.id)
    this.getUpdatedUnits(option.value);
    this.setState({
      scores: new Map(),
      currentPage: 0,
      selectedClassroom: option,
    }, this.fetchData
  );
  },

  selectDates(beginDate, endDate, dateFilterName) {
    window.localStorage.setItem('scorebookBeginDate', beginDate);
    window.localStorage.setItem('scorebookDateFilterName', dateFilterName);
    this.setState({
      scores: new Map(),
      currentPage: 0,
      beginDate: beginDate,
      endDate: endDate,
      dateFilterName
    }, this.fetchData);
  },

  convertStoredDateToMoment(savedString) {
    if(savedString && savedString !== 'null') {
      return moment(savedString)
    } else {
      return null;
    }
  },

  render() {
    let content,
      loadingIndicator;
    const scores = [];
    let index = 0;
    this.state.scores.forEach((s) => {
      index += 0;
      const sData = s.scores[0];
      scores.push(<StudentScores key={`${sData.userId}`} data={{ scores: s.scores, name: s.name, activity_name: sData.activity_name, userId: sData.userId, classroomId: this.state.selectedClassroom.id }} premium_state={this.props.premium_state} />);
    });

    if (this.state.loading) {
      content = <div>{scores}<LoadingIndicator /></div>;
    } else if (this.state.missing) {
      const onButtonClick = this.state.missing == 'activitiesWithinDateRange' ? () => { this.selectDates(null, null); } : null;
      content = <EmptyProgressReport missing={this.state.missing} onButtonClick={onButtonClick} />;
    } else {
      content = <div>{scores}</div>;
    }

    return (
      <div className="page-content-wrapper">
        <div className="tab-pane" id="scorebook">
          <div className="container">
            <section className="section-content-wrapper">
              <ScorebookFilters
                selectedClassroom={this.state.selectedClassroom}
                classroomFilters={this.state.classroomFilters}
                selectClassroom={this.selectClassroom}
                selectedUnit={this.state.selectedUnit}
                unitFilters={this.state.unitFilters}
                selectUnit={this.selectUnit}
                selectDates={this.selectDates}
                beginDate={this.state.beginDate}
                endDate={this.state.endDate}
                dateRangeFilterOptions={this.DATE_RANGE_FILTER_OPTIONS}
                dateFilterName={this.state.dateFilterName}
              />
              <ScoreLegend />
              <AppLegend />
            </section>
          </div>
          {content}
        </div>
      </div>
    );
  },
});
